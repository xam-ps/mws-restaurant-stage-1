let db;
dbPromise = idb.open('yelplight', 4, function (upgradeDb) {
  switch (upgradeDb.oldVersion) {
    case 0:
      upgradeDb.createObjectStore('restaurants', {
        keyPath: 'id'
      });
    case 1:
      reviewStore = upgradeDb.createObjectStore('reviews', {
        keyPath: 'id'
      });
      reviewStore.createIndex('restaurantId', 'restaurant_id');
    case 2:
      upgradeDb.createObjectStore('local_reviews', {
        keyPath: 'restaurant_id'
      });
    case 3:
      upgradeDb.createObjectStore('local_favs', {
        keyPath: 'restaurant_id'
      });
  }
});

/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */


  static get DATABASE_URL() {
    // const port = 1337 // Change this to your server port
    //return `http://localhost:${port}/`;
    return `https://sheltered-garden-81446.herokuapp.com/`;
  }

  static changeFavorite(id, state, callback) {
    const url = `${DBHelper.DATABASE_URL}restaurants/${id}/?is_favorite=${state}`;
    dbPromise.then(function (db) {
      let tx = db.transaction('restaurants');
      let restaurantStore = tx.objectStore('restaurants');
      return restaurantStore.get(Number(id));
    }).then(
      val => {
        val.is_favorite = state;
        dbPromise.then(function (db) {
          let tx = db.transaction('restaurants', 'readwrite');
          let restaurantStore = tx.objectStore('restaurants');
          restaurantStore.put(val);
        })
      }
    )
    fetch(url, {
        method: 'PUT'
      })
      .then(response => response.json())
      .then(function (response) {
        callback(0);
      })
      .catch(function (error) {
        dbPromise.then(function (db) {
          console.log("DB connection");
          let tx = db.transaction('local_favs', 'readwrite');
          let restaurantStore = tx.objectStore('local_favs');
          let rest = {};
          rest.restaurant_id = id;
          rest.state = state;
          restaurantStore.put(rest);
          return tx.complete;
        }).then(() => {
          navigator.serviceWorker.ready.then(swRegistration => {
            swRegistration.sync.register('syncFavs')
              .then(() => {
                console.log(`background sync registered for fav ${id}`);
                callback(0);
              });
          });

          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(function (reg) {
              if (reg.periodicSync) {
                reg.periodicSync.register({
                    tag: 'syncFavs',
                    minPeriod: 20000,
                    powerState: 'auto',
                    networkState: 'any'
                  })
                  .then(function (event) {
                    console.log('Periodic Sync registration successful', event);
                  })
                  .catch(function (error) {
                    console.log('Periodic Sync registration failed', error);
                  });
              } else {
                console.log("Background Sync not supported");
              }
            });
          } else {
            console.log("No active ServiceWorker");
          }
        })
      })
  }

  static sendFavsToBackend() {
    dbPromise.then(function (db) {
      console.log("DB connection");
      let tx = db.transaction('local_favs');
      let restaurantStore = tx.objectStore('local_favs');
      return restaurantStore.getAll();
    }).then(val => {
      val.forEach(function (fav) {
        console.log(`offline fav: ${fav}`);
        const url = `${DBHelper.DATABASE_URL}${fav.restaurant_id}/?is_favorite=${fav.state}`;
        fetch(url, {
            method: 'PUT'
          })
          .then(function (val) {
            console.log("fav successfull");
            dbPromise.then(function (db) {
              console.log("deleting fav form idb");
              let tx = db.transaction('local_favs', 'readwrite');
              let restaurantStore = tx.objectStore('local_favs');
              restaurantStore.delete(fav.restaurant_id)
            })
          }).catch(function (error) {
            console.log(error);
          });
      })
    })
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    const url = `${DBHelper.DATABASE_URL}restaurants`;
    fetch(url)
      .then(restaurants => restaurants.json())
      .then(function (response) {
        dbPromise.then(function (db) {
          let tx = db.transaction('restaurants', 'readwrite');
          let restaurantStore = tx.objectStore('restaurants');
          response.forEach(function (restaurant) {
            restaurantStore.put(restaurant);
          });
        });
        callback(null, response);
      }).catch(function (error) {
        dbPromise.then(function (db) {
          let tx = db.transaction('restaurants');
          let restaurantStore = tx.objectStore('restaurants');
          return restaurantStore.getAll();
        }).then(function (restaurants) {
          callback(null, restaurants);
        }).catch(function (error) {
          const msg = (`Request failed. Returned status of ${error}`);
          callback(msg, null);
        });
      });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.

    const url = `${DBHelper.DATABASE_URL}restaurants/${id}`;
    fetch(url)
      .then(restaurant => restaurant.json())
      .then(function (response) {
        dbPromise.then(function (db) {
          let tx = db.transaction('restaurants', 'readwrite');
          let restaurantStore = tx.objectStore('restaurants');
          restaurantStore.put(response);
        })
        callback(null, response);
      }).catch(function (error) {
        dbPromise.then(function (db) {
          let tx = db.transaction('restaurants');
          let restaurantStore = tx.objectStore('restaurants');
          return restaurantStore.get(Number(id));
        }).then(
          val => {
            if (val) {
              callback(null, val)
            } else {
              callback(`Sorry, you are offline right now!`, null);
            }
          }
        )
      });
  }

  static fetchReviews(id, callback) {
    // fetch all reviews for restaurant with id.

    const url = `${DBHelper.DATABASE_URL}reviews/?restaurant_id=${id}`;
    fetch(url)
      .then(review => review.json())
      .then(function (response) {
        dbPromise.then(function (db) {
          let tx = db.transaction('reviews', 'readwrite');
          let reviewStore = tx.objectStore('reviews');
          response.forEach(function (review) {
            reviewStore.put(review);
          });
        });
        callback(null, response.reverse());
      }).catch(function (error) {
        dbPromise.then(function (db) {
          let tx = db.transaction('reviews');
          let reviewStore = tx.objectStore('reviews').index('restaurantId');
          return reviewStore.getAll(Number(id));
        }).then(function (reviews) {
          dbPromise.then(function (db) {
            let tx = db.transaction('local_reviews');
            let localReviewStore = tx.objectStore('local_reviews');
            return localReviewStore.getAll(Number(id));
          }).then(function (localReviews) {
            let allReviews = reviews.concat(localReviews);
            callback(null, allReviews.reverse());
          })
        }).catch(function (error) {
          const msg = (`Request failed. Returned status of ${error}`);
          callback(msg, null);
        });
      });
  }

  static submitReview(review) {
    const url = `${DBHelper.DATABASE_URL}reviews/`;
    fetch(url, {
        method: 'POST',
        body: JSON.stringify(review),
        headers: {
          'content-type': 'application/json'
        },
      })
      .then(response => response.json())
      .then(function (val) {
        console.log(val);
      }).catch(function (error) {
        dbPromise.then(function (db) {
          let tx = db.transaction('local_reviews', 'readwrite');
          let restaurantStore = tx.objectStore('local_reviews');
          restaurantStore.put(review);
        }).then(() => {
          navigator.serviceWorker.ready.then(swRegistration => {
            swRegistration.sync.register('syncReviews')
              .then(() => {
                console.log(`background sync registered for ${review}`);
              });
          });

          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(function (reg) {
              if (reg.periodicSync) {
                reg.periodicSync.register({
                    tag: 'syncReviews',
                    minPeriod: 20000,
                    powerState: 'auto',
                    networkState: 'any'
                  })
                  .then(function (event) {
                    console.log('Periodic Sync registration successful', event);
                  })
                  .catch(function (error) {
                    console.log('Periodic Sync registration failed', error);
                  });
              } else {
                console.log("Background Sync not supported");
              }
            });
          } else {
            console.log("No active ServiceWorker");
          }

          /* navigator.serviceWorker.ready.then(function (swRegistration) {
            return swRegistration.sync.register('syncReviews');
          }); */
        })
      });
  }

  static sendToBackend() {
    dbPromise.then(function (db) {
      console.log("DB connection");
      let tx = db.transaction('local_reviews');
      let restaurantStore = tx.objectStore('local_reviews');
      return restaurantStore.getAll();
    }).then(val => {
      val.forEach(function (review) {
        console.log(`offline review: ${review}`);
        const url = `${DBHelper.DATABASE_URL}reviews/`;
        fetch(url, {
            method: 'POST',
            body: JSON.stringify(review),
            headers: {
              'content-type': 'application/json'
            },
          })
          .then(response => response.json())
          .then(function (val) {
            console.log("successfull");
            dbPromise.then(function (db) {
              console.log("deleting form idb");
              let tx = db.transaction('local_reviews', 'readwrite');
              let restaurantStore = tx.objectStore('local_reviews');
              restaurantStore.delete(review.restaurant_id)
            })
          }).catch(function (error) {
            console.log(error);
          });
      })
    })
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    if (restaurant.photograph) {
      return (`/img/${restaurant.photograph}.jpg`);
    } else {
      return '-1';
    }
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP
    });
    return marker;
  }

}
let db;
dbPromise = idb.open('yelplight', 1, function (upgradeDb) {
  upgradeDb.createObjectStore('restaurants', { keyPath: 'id' });
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
    return `https://pure-fjord-23296.herokuapp.com/`;
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
        dbPromise.then(db => {
          return db.transaction('restaurants')
            .objectStore('restaurants').get(id);
        }).then(obj => console.log(obj));
        dbPromise.then(function (db) {
          let tx = db.transaction('restaurants');
          let restaurantStore = tx.objectStore('restaurants');
          return restaurantStore.get(Number(id));
        }).then(
          val => callback(null, val)
        ).catch(function (error) {
          callback(`Sorry, you are offline right now!`, null);
        });
      });
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
    }
    );
    return marker;
  }

}

let restaurants,
  neighborhoods,
  cuisines
var map
var markers = []

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  registerServiceWorker();
  fetchNeighborhoods();
  fetchCuisines();
});

registerServiceWorker = function () {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(function (reg) {
      console.log("Service Worker Registered");
    });
  }
}

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
}

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  var imgsrc = DBHelper.imageUrlForRestaurant(restaurant);
  if (parseInt(imgsrc) != -1) {
    image.title = `Picture of ${restaurant.name}`;
    image.alt = `Picture of ${restaurant.name}`;
  } else {
    imgsrc = '/img/noimage.jpg';
    image.title = `No image for ${restaurant.name} available`;
    image.alt = `No image for ${restaurant.name} available`;
  }
  imgsrc = imgsrc.split('.');
  image.src = `${imgsrc[0]}-450.${imgsrc[1]}`;
  image.setAttribute('width', '450');
  image.setAttribute('data-srcset', `${imgsrc[0]}-200.${imgsrc[1]} 200w, ${imgsrc[0]}-400.${imgsrc[1]} 400w, ${imgsrc[0]}-600.${imgsrc[1]} 600w, ${imgsrc[0]}.${imgsrc[1]} 800w`);
  image.className += ' lazyload';

  li.append(image);

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more)

  const fav = document.createElement('p');
  fav.className = 'fav';
  if ((restaurant.is_favorite == 'true') || (restaurant.is_favorite == true)) {
    fav.innerHTML = '<div class="red">♥</div>';
  } else {
    fav.innerHTML = '<div class="black">♥</div>';
  }
  fav.addEventListener("click", function () {
    toggleFav(restaurant.id, fav);
  });
  li.append(fav);

  const mapSwitch = document.getElementById('mapSwitch');
  mapSwitch.addEventListener("click", function(){
    toggleMap2();
    mapSwitch.style.display = 'none';
  });

  return li
}

toggleFav = (id, elm) => {
  if (elm.innerHTML == '<div class="red">♥</div>') {
    DBHelper.changeFavorite(id, 'false', (res) => {
      if (res === 0) {
        elm.innerHTML = '<div class="black">♥</div>';
      } else {
        alert(`Sorry, but you're offline right now`);
      }
    })
  } else {
    DBHelper.changeFavorite(id, 'true', (res) => {
      if (res === 0) {
        elm.innerHTML = '<div class="red">♥</div>';
      } else {
        alert(`Sorry, but you're offline right now`);
      }
    })
  }
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}

toggleMap2 = () => {
  let mapContainer = document.getElementById('map-container');
  if(mapContainer.style.display == "none"){
    mapContainer.style.display = "block";
  } else {
    mapContainer.style.display = "none";
  }
}
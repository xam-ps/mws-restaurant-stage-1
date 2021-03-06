let restaurant;
var map;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  registerServiceWorker();
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
  let close = document.getElementById('closeReview');
  close.addEventListener("click", function () {
    toggleRev(0);
  });
  let open = document.getElementById('openReview');
  open.addEventListener("click", function () {
    toggleRev(1);
  });
  let form = document.getElementById('reviewForm');
  form.addEventListener('submit', event => {
    event.preventDefault();
    submit();
  });
  const mapSwitch = document.getElementById('mapSwitch');
  mapSwitch.addEventListener("click", function () {
    let mapContainer = document.getElementById('map-container');
    mapContainer.style.display = "block";
    mapSwitch.style.display = 'none';
  });
  window.onkeyup = function (e) {
    var key = e.keyCode ? e.keyCode : e.which;
    if (key == 27) {
      const rev = document.getElementById('writeReview');
      const display = rev.style.display;
      if (display != 'none') {
        rev.style.display = 'none';
      }
    }
  }
}

submit = function () {
  let form = document.getElementById('reviewForm');
  let name = form.elements["name"];
  let rating = form.elements["rating"];
  let comments = form.elements["comments"];
  let review = {};
  review.name = name.value;
  review.rating = rating.value;
  review.comments = comments.value;
  review.restaurant_id = Number(getParameterByName('id'));
  DBHelper.submitReview(review);
  name.value = '';
  rating.value = 1;
  comments.value = '';
  const ul = document.getElementById('reviews-list');
  ul.insertBefore(createReviewHTML(review), ul.firstChild);
  toggleRev(0);
}

toggleRev = function (onOff) {
  let rev = document.getElementById('writeReview');
  if (onOff) {
    rev.style.display = 'block';
  } else {
    rev.style.display = 'none';
  }
}

registerServiceWorker = function () {
  if (navigator.serviceWorker) {
    console.log("ServiceWorkers are supported");

    navigator.serviceWorker.register('sw.js', {
        scope: './'
      })
      .then(function (reg) {
        console.log("ServiceWorker registered ◕‿◕", reg);
      })
      .catch(function (error) {
        console.log("Failed to register ServiceWorker ಠ_ಠ", error);
      });
  }
}

fetchReviews = () => {
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchReviews(id, (error, reviews) => {
      self.restaurant.reviews = reviews;
      // fill reviews
      fillReviewsHTML();
    });
  }
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        document.getElementById('restaurant-name').innerHTML = error;
        document.getElementById('restaurant-address').innerHTML = `<a href="/">Bring me home</a>`;
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
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
  document.getElementById('headingReview').innerHTML = `Review for ${restaurant.name}`;
  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  fetchReviews();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = review.date;
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  li.setAttribute("aria-current", "page");
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
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
  let sent = document.getElementById('sendReview');
  sent.addEventListener("click", function () {
    submit();
  });
  let form = document.getElementById('reviewForm');
  form.addEventListener('submit', event => {
    event.preventDefault();
    submit();
    console.log('Form submission cancelled.');
  });
}

submit = function() {
  let form = document.getElementById('reviewForm');
  let name = form.elements["name"];
  let rating = form.elements["rating"];
  let comments = form.elements["comments"];
  // TODO: sent Form data or store in idb
  name.value = '';
  rating.value = 1;
  comments.value = '';
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
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(function (reg) {
      console.log("Service Worker Registered");
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
    image.src = imgsrc;
    imgsrc = imgsrc.split('.');
    image.srcset = `${imgsrc[0]}-200.${imgsrc[1]} 200w, ${imgsrc[0]}-400.${imgsrc[1]} 400w, ${imgsrc[0]}-600.${imgsrc[1]} 600w, ${imgsrc[0]}.${imgsrc[1]} 800w`;
    image.title = `Picture of ${restaurant.name}`;
    image.alt = `Picture of ${restaurant.name}`;
  } else {
    image.src = '/img/noimage.jpg';
    imgsrc = image.src.split('.');
    image.srcset = `${imgsrc[0]}-200.${imgsrc[1]} 200w, ${imgsrc[0]}-400.${imgsrc[1]} 400w, ${imgsrc[0]}-600.${imgsrc[1]} 600w, ${imgsrc[0]}.${imgsrc[1]} 800w`;
    image.title = `No image for ${restaurant.name} available`;
    image.alt = `No image for ${restaurant.name} available`;
  }
  document.getElementById('headingReview').innerHTML = `Review for ${restaurant.name}`;
  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
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
  const title = document.createElement('h2');
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
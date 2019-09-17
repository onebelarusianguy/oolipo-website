'use strict';

/**
 * Globals
 */
var _scroll,
	vpWidth,
	vpHeight,
	$body = $('body'),
	$wrapper = $('.wrapper'),
	$menu = $('.menu'),
	footer = document.querySelector('.footer'),
	header = document.querySelector('.header'),
	body = document.documentElement || document.body,
	head = document.getElementsByTagName('head')[0],
	mobileBreakpoint = 768,
	isMobile = false,
	isHomePage = false,
	isDiscoverPage = false,
	isStoryWorldDetails = false;

//raf polyfill
(function() {
	var lastTime = 0;
	var vendors = ['ms', 'moz', 'webkit', 'o'];
	for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
		window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
		window.cancelAnimationFrame =
			window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
	}

	if (!window.requestAnimationFrame)
		window.requestAnimationFrame = function(callback, element) {
			var currTime = new Date().getTime();
			var timeToCall = Math.max(0, 16 - (currTime - lastTime));
			var id = window.setTimeout(function() {
					callback(currTime + timeToCall);
				},
				timeToCall);
			lastTime = currTime + timeToCall;
			return id;
		};

	if (!window.cancelAnimationFrame)
		window.cancelAnimationFrame = function(id) {
			clearTimeout(id);
		};
}());

//performance.now() polyfill
(function() {
	if (!window.performance) {
		window.performance = {};
	}

	Date.now = (Date.now || function() { // thanks IE8
		return new Date().getTime();
	});

	if (!window.performance.now) {

		var nowOffset = Date.now();

		if (performance.timing && performance.timing.navigationStart) {
			nowOffset = performance.timing.navigationStart
		}

		window.performance.now = function now() {
			return Date.now() - nowOffset;
		}
	}
}());


/**
 * Support stuff
 * @author Pavel Marhaunichy
 */

$.supp = {
	cssTransform3d: null,
	cssTransform2d: null,
	cssFilter: null,
	transitionEnd: null,
	transition: null,
	animationEnd: null,
	animation: null,

	init: function() {
		this.el = document.getElementsByTagName('body')[0];
		this.cssFilterCheck();
		this.css3dTransformCheck();
		this.transitionCheck();
		this.animationCheck();
	},

	cssFilterCheck: function() {
		var filters = {
			'webkitFilter': '-webkit-filter',
			'filter': 'filter'
		}

		for (var f in filters) {
			this.el.style[f] = 'grayscale(0)';
			var value = getComputedStyle(this.el)[f];
			if (value !== undefined && value !== null && value !== 'none' && value.length) this.cssFilter = f;
			this.el.style.removeProperty(filters[f]);
		}
	},

	css3dTransformCheck: function() {
		var transforms = {
			'webkitTransform': '-webkit-transform',
			'msTransform': '-ms-transform',
			'transform': 'transform'
		};

		for (var t in transforms) {
			this.el.style[t] = 'translate3d(1px, 1px, 1px)';
			var value = getComputedStyle(this.el).getPropertyValue(transforms[t]);
			if (value !== undefined && value !== null && value !== 'none' && value.length) {
				this.cssTransform3d = t;
			}

			this.el.style[t] = 'translate(1px, 1px)';
			var value = getComputedStyle(this.el).getPropertyValue(transforms[t]);
			if (value !== undefined && value !== null && value !== 'none' && value.length) this.cssTransform2d = t;

			this.el.style.removeProperty(transforms[t]);
		}
	},

	transitionCheck: function() {
		var transitions = {
			'WebkitTransition': 'webkitTransitionEnd',
			'transition': 'transitionend' // IE10
		};

		for (var t in transitions) {
			if (this.el.style[t] !== undefined) {
				this.transitionEnd = transitions[t];
				this.transition = t;
			}
		}
	},

	animationCheck: function() {
		var animations = {
			'WebkitAnimation': 'webkitAnimationEnd',
			'animation': 'animationend' // IE10
		}

		for (var a in animations) {
			if (this.el.style[a] !== undefined) {
				this.animationEnd = animations[a];
				this.animation = a;
			}
		}
	}
}
$.supp.init();


$.browser = {
	webkit: /WebKit/i.test(navigator.userAgent),
	mobile: /Android|iPhone|iPad|iPod|IEMobile|BlackBerry|Opera Mini/i.test(navigator.userAgent),
	ie: /Trident/i.test(navigator.userAgent),
	edge: /Edge/i.test(navigator.userAgent),
	safari: /Safari/i.test(navigator.userAgent),
	chrome: /Chrome/i.test(navigator.userAgent),
	ios: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

$.platform = {
	mac: navigator.platform.toLowerCase().indexOf('mac') !== -1
}





/**
 * Smooth Animate 0.2.1
 * More efficient animations
 * @author Pavel Marhaunichy
 * @param   {object} props   Object with properties and number values
 * @param   {object} options Object with options. Defaults:
 *                           duration: 400,
 *                           easing: easeInOut,
 *                           queue: true,
 *                           step: function(progress, element, value) {},
 *                           complete: function (elements) {}
 * @returns {object} Object/jQuery object
 */

;
(function(global, window, document, undefined) {
	'use strict';

	/**
	 * @private
	 * Plugin name var
	 */
	var pluginName = 'smoothAnimate',
		/**
		 * Default settings
		 */
		defaults = {
			duration: 400,
			easing: 'easeInOut',
			step: function(progress, element, value) {
			},
			complete: function(elements) {
			},
			queue: true
		};

	/**
	 * @private
	 * Parse numeric value/units
	 * @param   {string} value String to parse
	 * @returns {Array}        [originalString, operator, numeric value, units]
	 */
	function parseValue(value) {
		return value.toString().match(/^(\+\=|\-\=|\*\=|\/\=)?([+-]?(?:\d+|\d*\.\d+))([a-z]*|%)$/i);
	}

	/**
	 * @private
	 * Retrieve unit type for simple properties. Used when one is not supplied by user
	 * @param   {string} property Property name in camelCase notation
	 * @returns {string}          Unit type
	 */
	function setUnitType(property) {
		property = normalizeProperty(property);
		if (/(^(zIndex|fontWeight|opacity)$)/.test(property)) return '';
		return 'px';
	}

	/**
	 * @private
	 * Normalize css property's name to camelCase
	 * @param   {string} property Property name
	 * @returns {string} camelCase name
	 */
	function normalizeProperty(property) {
		return property.replace(/-(\w)/g, function(match, subMatch) {
			return subMatch.toUpperCase();
		});
	}

	/**
	 * @private
	 * Generate easing from bezier coordinates
	 * @param   {String|Array} funcName/coordArr  String with easing function name/array with bezier coords
	 * @param   {string}       predefinedFuncName Name for new easing function to create
	 * @returns {function}     Easing function
	 */
	function bezier(funcName, coordArr, predefinedFuncName) {
		if (Array.isArray(funcName)) {
			coordArr = funcName;

			if (predefinedFuncName) funcName = predefinedFuncName;
			else funcName = pluginName + '_' + coordArr.join('_').replace(/\./g, 'd').replace(/\-/g, 'm');
		}
		if (typeof $.easing[funcName] !== 'function') {
			var newBezFunc = function(progress, cX1, cY1, cX2, cY2) {

				function A(a1, a2) {
					return 1 - 3 * a2 + 3 * a1;
				}

				function B(a1, a2) {
					return 3 * a2 - 6 * a1;
				}

				function C(a1) {
					return 3 * a1;
				}

				function calcBezier(t, a1, a2) {
					return ((A(a1, a2) * t + B(a1, a2)) * t + C(a1)) * t;
				}

				function slopeGet(t, a1, a2) {
					return 3 * A(a1, a2) * t * t + 2 * B(a1, a2) * t + C(a1);
				}

				function tForX(progress) {
					var aT = progress,
						i;
					for (i = 0; i < 14; ++i) {
						var currSlope = slopeGet(aT, cX1, cX2);
						if (currSlope === 0) return aT;
						var currX = calcBezier(aT, cX1, cX2) - progress;
						aT -= currX / currSlope;
					}
					return aT;
				}

				return calcBezier(tForX(progress), cY1, cY2);
			};

			$.easing[funcName] = function(x, t, b, c, d) {
				return c * newBezFunc(x, coordArr[0], coordArr[1], coordArr[2], coordArr[3]) + b;
			};
		}
		return funcName;
	}

	/**
	 * @public
	 * Predefined easings
	 */
	[
		['ease', [0.25, 0.1, 0.25, 1]],
		['easeIn', [0.42, 0, 1, 1]],
		['easeOut', [0, 0, 0.58, 1]],
		['easeInOut', [0.42, 0, 0.58, 1]],
		['easeInSine', [0.47, 0, 0.745, 0.715]],
		['easeOutSine', [0.39, 0.575, 0.565, 1]],
		['easeInOutSine', [0.445, 0.05, 0.55, 0.95]],
		['easeInQuad', [0.55, 0.085, 0.68, 0.53]],
		['easeOutQuad', [0.25, 0.46, 0.45, 0.94]],
		['easeInOutQuad', [0.455, 0.03, 0.515, 0.955]],
		['easeInCubic', [0.55, 0.055, 0.675, 0.19]],
		['easeOutCubic', [0.215, 0.61, 0.355, 1]],
		['easeInOutCubic', [0.645, 0.045, 0.355, 1]],
		['easeInQuart', [0.895, 0.03, 0.685, 0.22]],
		['easeOutQuart', [0.165, 0.84, 0.44, 1]],
		['easeInOutQuart', [0.77, 0, 0.175, 1]],
		['easeInQuint', [0.755, 0.05, 0.855, 0.06]],
		['easeOutQuint', [0.23, 1, 0.32, 1]],
		['easeInOutQuint', [0.86, 0, 0.07, 1]],
		['easeInExpo', [0.95, 0.05, 0.795, 0.035]],
		['easeOutExpo', [0.19, 1, 0.22, 1]],
		['easeInOutExpo', [1, 0, 0, 1]],
		['easeInCirc', [0.6, 0.04, 0.98, 0.335]],
		['easeOutCirc', [0.075, 0.82, 0.165, 1]],
		['easeInOutCirc', [0.785, 0.135, 0.15, 0.86]],
		['easeInBack', [0.6, -0.28, 0.735, 0.045]],
		['easeOutBack', [0.175, 0.885, 0.32, 1.275]],
		['easeInOutBack', [0.68, -0.49, 0.265, 1.55]]
	].forEach(function(easing) {
		if (!$.easing[easing[0]]) {
			bezier(easing[1], null, easing[0]);
		}
	});

	/**
	 * @public
	 * @constructor
	 * @param {object} elements Element(s)
	 * @param {object} props    Object with properties to animate
	 * @param {object} options  Options object
	 */
	var SmoothAnimate = function(elements, props, options) {
		this.props = props;
		this.elements = elements;
		this.options = $.extend({}, defaults, options);
		this._init();
	};

	/**
	 * SmoothAnimate prototype
	 */
	SmoothAnimate.prototype = {
		/**
		 * @private
		 * Initialization
		 */
		_init: function() {
			this.startTime = Date.now();
			this._prepare();
			this._loop();
		},

		/**
		 * @private
		 * Preparing to animate
		 */
		_prepare: function() {
			this.options.easing = typeof this.options.easing === 'string' ? this.options.easing : bezier(this.options.easing);
			this.length = this.elements.length;
			this.properties = Object.create(null);
			var i;

			for (i = 0; i < this.length; i++) {
				var values = Object.create(null),
					property;

				for (property in this.props) {
					if (this.props.hasOwnProperty(property)) {

						var fromVal,
							toVal,
							getVal,
							getVal2,
							units,
							operator;

						if (Array.isArray(this.props[property])) {
							getVal = parseValue(this.props[property][0]);
							getVal2 = parseValue(this.props[property][1]);

							fromVal = +getVal[2];
							toVal = +getVal2[2];
							units = getVal[3] || getVal2[3] || setUnitType(property);
						} else {
							getVal = parseValue(this.props[property]);

							toVal = +getVal[2];
							operator = getVal[1];
							units = getVal[3] || setUnitType(property);

							if (property === 'scrollTop' || property === 'scrollLeft') {
								fromVal = _scroll;
							} else {
								fromVal = parseFloat(getComputedStyle(this.elements[i])[property]) || 0;
							}

							switch (operator) {
								case '+=':
									toVal = fromVal + toVal;
									break;
								case '-=':
									toVal = fromVal - toVal;
									break;
								case '*=':
									toVal = fromVal * toVal;
									break;
								case '/=':
									toVal = fromVal / toVal;
							}

						}
						values[property] = {
							from: fromVal,
							to: toVal,
							units: units
						};
					}
				}
				this.properties[i] = values;
			}
		},

		/**
		 * @private
		 * Animation loop
		 */
		_loop: function() {
			var _this = this,
				timePassed = Date.now() - this.startTime,
				progress = timePassed / this.options.duration,
				value,
				i,
				property;

			if (progress > 1) {
				progress = 1;
				timePassed = this.options.duration;
			}

			for (i = 0; i < this.length; i++) {
				for (property in this.props) {
					if (this.props.hasOwnProperty(property)) {

						if (this.options.easing === 'linear') {
							value = this.properties[i][property].from +
								progress * (this.properties[i][property].to - this.properties[i][property].from);
						} else {
							value = $.easing[this.options.easing](progress, timePassed, this.properties[i][property].from,
								this.properties[i][property].to - this.properties[i][property].from, this.options.duration);
						}

						//Special animated properties
						if (property === 'scrollTop') {
							window.scrollTo(0, value);
							continue;
						} else if (property === 'scrollLeft') {
							window.scrollTo(value, 0);
							continue;
						}
						if (property === 'value') {
							continue;
						}

						//skip DOM update if it is not needed
						if (this.properties[i][property].to === this.properties[i][property].from) continue;

						//set style properties
						this.elements[i].style[property] = value + this.properties[i][property].units;
					}
				}
				//call step function
				this.options.step(progress, this.elements[i], value); //value of the last property
			}

			if (timePassed < this.options.duration) {
				requestAnimationFrame(function() {
					_this._loop();
				});
			} else {
				this.elements[this.length - 1].removeAttribute('data-smooth-animate');

				this.options.complete(this.elements);

				queue.run(this.elements);
			}
		}
	};


	/**
	 * @private
	 * @decorator
	 * @param   {function} func Function
	 * @returns {object} New instance
	 */
	function constructorDecorator(func) {
		return function() {
			var elems = arguments[0].length ? arguments[0] : [arguments[0]],
				instance = elems[elems.length - 1].getAttribute('data-smooth-animate');

			if (instance === 'running') {
				queue.add(elems[elems.length - 1], arguments[1], arguments[2]);
			} else {
				instance = new func(elems, arguments[1], arguments[2]);
				//if the queue is enabled - set flag that we started to prevent new calls on these elems
				//and pass them to queue
				if (instance.options.queue) {
					elems[elems.length - 1].setAttribute('data-smooth-animate', 'running');
				}
				return instance;
			}
		};
	}

	SmoothAnimate = constructorDecorator(SmoothAnimate);

	/**
	 * Queue of calls
	 */
	var queue = {
		calls: [],

		add: function(el, props, options) {
			this.calls.push([el, props, options]);
		},

		run: function(elems) {
			var lastElCall = elems[elems.length - 1],
				len = this.calls.length,
				i;

			for (i = 0; i < len; i++) {
				var lastElQueue = this.calls[i][0];

				if (lastElCall === lastElQueue) {
					SmoothAnimate(elems, this.calls[i][1], this.calls[i][2]);
					//remove current call from queue
					this.calls.splice(i, 1);
					return;
				}
			}
		}
	};
	SmoothAnimate.queue = queue;

	/**
	 * Make jQuery plugin
	 */
	if (window.jQuery) {
		$.fn[pluginName] = function(props, options) {
			SmoothAnimate(this, props, options);
			return this;
		};
	}

	//Globalize SmoothAnimate
	window.SmoothAnimate = SmoothAnimate;

})((window.jQuery || window), window, document);


/**
 * Get viewport dimensions
 * @author Pavel Marhaunichy
 * @returns {object} Returns width and height considering scrollbar
 */
function viewport() {
	var w = window,
		i = 'inner';
	if (!('innerWidth' in window)) {
		w = body;
		i = 'client';
	}

	vpWidth = w[i + 'Width'];
	vpHeight = w[i + 'Height'];

	return {
		width: vpWidth,
		height: vpHeight
	};
}
viewport();


/**
 * Check if it's mobile device
 * Will be called in other func
 * @author Pavel Marhaunichy
 */
function areYouMobile() {
	if (vpWidth < mobileBreakpoint) isMobile = true;
	else isMobile = false;
}

/**
 * Check if it's homepage
 * @author Pavel Marhaunichy
 */
function areYouHome() {
	if ($body.hasClass('p-home')) isHomePage = true;
	else isHomePage = false;
}
areYouHome();

/**
 * Check if it's DiscoverPage
 * @author Pavel Marhaunichy
 */
function areYouDiscover() {
	if ($body.hasClass('p-discover')) isDiscoverPage = true;
	else isDiscoverPage = false;
}
areYouDiscover();

/**
 * Check if it's story world details page.
 */
function areYouStoryWorldDetails() {
	if ($body.hasClass('p-storyworld')) isStoryWorldDetails = true;
	else isStoryWorldDetails = false;
}
areYouStoryWorldDetails();

/**
 * _scroll variable always contains current scroll position
 * @author Pavel Marhaunichy
 */
function getCurrentScroll() {
	_scroll = document.documentElement.scrollTop || document.body.scrollTop;
}
getCurrentScroll();


/**
 * Do all work on scroll through requestAnimationFrame
 * @author Pavel Marhaunichy
 */
function rafLoop() {
	requestAnimationFrame(_onscroll);
}
window.addEventListener('scroll', rafLoop, false);

/**
 * Call these functions on scroll event
 * @author Pavel Marhaunichy
 */
function _onscroll() {
	getCurrentScroll();

	synopsisCloseOnScroll();
}

/**
 * Call these functions on window resize event
 * @author Pavel Marhaunichy
 */
function _onresize() {

	//firstly
	viewport();

	getCurrentScroll();

	mobileMenu();

	mobileBannerShow();

	updateModalSize();

	if (isDiscoverPage) rebuildIsotope();

}

/**
 * Mobile menu
 * @author Pavel Marhaunichy
 */

function mobileMenu() {
	areYouMobile();

	if (isMobile) {
		$body.addClass('menu-mobile');
	} else {
		$body.removeClass('menu-mobile');
	}
}
mobileMenu();

/**
 * Menu Handler
 * @author Pavel Marhaunichy
 */
function menuHandler() {
	$('.menu-toggle').on('click', function() {

		if ($body.hasClass('menu-mobile-opened')) {

			//close mobile menu
			$menu.animate({
				opacity: 0
			}, {
				duration: 400,
				complete: function() {
					$body.removeClass('menu-mobile-opened');
					$menu.removeAttr('style');
				}
			})

		} else {

			//open mobile menu
			$menu.css('visibility', 'visible').animate({
				opacity: 1
			}, {
				duration: 400,
				complete: function() {
					$body.addClass('menu-mobile-opened');
				}
			})

		}

	});
}
menuHandler();

/**
 * Mobile Banner Handler
 */
var mobileBanner = document.querySelector('.mobile-banner');

/**
 * To avoid issue with Safari in private window
 */
var localStorageIsAvailable = null;

if (typeof sessionStorage === 'object') {
	try {
		localStorageIsAvailable = true;
		if (!sessionStorage.getItem('mobileBannerWasClosed')) sessionStorage.setItem('mobileBannerWasClosed', 'false');
	} catch (e) {
		localStorageIsAvailable = false;
		Storage.prototype._setItem = Storage.prototype.setItem;
		Storage.prototype.setItem = function() {
		};
	}
}

/**
 * Show banner only for iOS in portrait orientation
 * @author Pavel Marhaunichy
 */
function mobileBannerShow() {
	if ($.browser.ios && vpWidth < vpHeight && localStorageIsAvailable &&
		'true' !== sessionStorage.getItem('mobileBannerWasClosed'))
		mobileBanner.style.display = 'block';
	else
	//for sure
		mobileBanner.style.display = 'none';
}
mobileBannerShow();

$(mobileBanner.querySelector('.mobile-banner__close')).on('click', function() {
	$(mobileBanner).slideUp(400, function() {
		sessionStorage.setItem('mobileBannerWasClosed', 'true');
		//it's really necessary
		_onresize();
	});
});

window.addEventListener('resize', function() {
	_onresize();
});


/**
 * Simple Tabs
 * @author Pavel Marhaunichy
 */
function tabs() {
	var $tabs = $('.tabs');
	if (!$tabs.length) return;

	var $links = $tabs.find('.tabs__link'),
		$active = $('.tabs__link_active'),
		$content = $('.tabs__content'),
		startTab = $active[0].getAttribute('href');

	$(startTab).show();

	$links.on('click', function(e) {
		e.preventDefault();
		if ($(this).hasClass('tabs__link_active')) return;

		var hash = this.getAttribute('href');

		// overflow fix discover tab/regular tabs
		if ('#storyworlds' === hash)
			$body.add('html').css('overflow', 'hidden');
		else
			$body.add('html').css('overflow', '');

		$links.removeClass('tabs__link_active');
		$(this).addClass('tabs__link_active');

		//$content.fadeOut(400);

		$content
			.find('.tabs__tab')
			.not(hash)
			.css('display', 'none');

		$(hash).fadeIn(400);
	});

}
tabs();


/**
 * Storyworld Slider
 */

var $storyworldSlider = $('.storyworld-slider');
if ($storyworldSlider.length) storyworldSlider();

function storyworldSlider() {
	$storyworldSlider.owlCarousel({
		loop: true,
		autoplay: true, //default false
		video: false, //default false
		smartSpeed: 700,
		nav: true, //default false
		dots: false, //default true
		dotsClass: '',
		dotClass: '',
		controlsClass: 'storyworld-slider-controls',
		navClass: ['storyworld-slider-controls__prev ico-arrow-left-thin',
			'storyworld-slider-controls__next ico-arrow-right-thin'],
		navText: false,
		autoplayTimeout: 4000,
		URLhashListener: false, //default false
		responsive: {
			0: {
				items: 1,
			},
			992: {
				items: 2,
			}
		}
	});
}


/**
 * Stills Slider
 */

var $stillsSlider = $('.stills-slider');
if ($stillsSlider.length) stillsSlider();

function stillsSlider() {

	//a bit of crutches
	var flag,
		$stills = $stillsSlider.parents('.stills');

	if ($stills.is(':hidden')) {
		flag = true;
		$stills.css('display', 'block');
	}


	$stillsSlider.on('initialized.owl.carousel', function() {
		if (flag) $stills.css('display', 'none');
	});

	$stillsSlider.owlCarousel({
		margin: 40,
		loop: false,
		autoplay: true, //default false
		video: false, //default false
		smartSpeed: 700,
		nav: false, //default false
		dots: true, //default true
		dotsClass: 'stills-slider-dots',
		dotClass: 'stills-slider-dots__dot',
		controlsClass: '',
		navClass: [],
		navText: false,
		autoplayTimeout: 4000,
		responsive: {
			0: {
				items: 2,
			},
			768: {
				items: 3,
			}
		}
	});
	//	
	///*	$('.stills-inner-slider').owlCarousel({
	//		loop: true,
	//		autoplay: false, //default false
	//		video: false, //default false
	//		smartSpeed: 700,
	//		nav: false, //default false
	//		dots: true, //default true
	//		dotsClass: 'stills-inner-dots',
	//		dotClass: 'stills-inner-dots__dot',
	//		controlsClass: '',
	//		navClass: [],
	//		navText: false,
	//		autoplayTimeout: 4000,
	//		responsive: {
	//			0: {
	//				items: 1,
	//			},
	//			992: {
	//				items: 2,
	//			}
	//		}
	//	});*/
}

/**
 * Synopsis
 */
var synopsisIsOpen = false,
	episodeSynopsisIsOpen = false,
	episodeSynopsis = null,
	episodeBackground = null,
	$storyWorldWrapper = null,
	$storyWorldBg = null,
	$synopsisBtn = null,
	$synopsisInner = null,
	$synopsis = null,
	$synopsisClose = null;

/**
 * Shows episode synopsis and blur content under it.
 * @param synopsisId episode synopsis container id.
 * @param blurContent content to blur.
 */
function showEpisodeSynopsis(synopsisId, blurContent) {
	episodeSynopsis = $('#' + synopsisId);
	episodeBackground = $('#' + blurContent);
	episodeSynopsis.css('display', 'block');
	blurElem(episodeBackground, 700, null, function() {
		episodeSynopsis.addClass('animated');
		episodeSynopsisIsOpen = true;
	});
}

/**
 * Close episode synopsis popup.
 */
function closeEpisodeSynopsis() {
	episodeSynopsis.removeClass('animated');
	episodeSynopsisIsOpen = false;
	setTimeout(function() {
		unBlurElem(episodeBackground, 700, null, function() {
			episodeSynopsis.css('display', 'none');
		});
	}, 400);
}

function initSynopsis() {
	$storyWorldWrapper = $('.storyworld-wrapper');
	$storyWorldBg = $storyWorldWrapper.find('.section__bg');
	$synopsisBtn = $('.js-synopsis');
	$synopsisInner = $storyWorldWrapper.find('.storyworld-inner');
	$synopsis = $('.synopsis');
	$synopsisClose = $synopsis.find('.js-synopsis__close');

	$synopsisBtn.on('click', function(e) {
		e.preventDefault();
		//$synopsisInner.css('display', 'none');
		$synopsisInner.fadeOut();
		$synopsis.css('display', 'block');

		blurElem($storyWorldBg, 700, null, function() {
			$synopsis.addClass('animated');
			synopsisIsOpen = true;
		});
	});

	$synopsisClose.on('click', closeSynopsis);
}

function synopsisCloseOnScroll() {
	if (synopsisIsOpen)
		closeSynopsis();
	else if (episodeSynopsisIsOpen)
		closeEpisodeSynopsis();
}

function closeSynopsis() {
	$synopsis.removeClass('animated');

	//firtsly
	synopsisIsOpen = false;

	setTimeout(function() {
		unBlurElem($storyWorldBg, 700, null, function() {
			$synopsis.css('display', 'none');
			//$synopsisInner.css('display', 'inline-block');
			$synopsisInner.fadeIn();
		});
	}, 400);

}

/**
 * Blur $elem
 * @author Pavel Marhaunichy
 * @param {object}   $elem      jQuery object
 * @param {number}   duration   Animation duration
 * @param {function} callback1  Pre-callback
 * @param {function} callback2  Post-callback
 * @param {number}   [value=12] Blur value in px
 */
function blurElem($elem, duration, callback1, callback2, value) {
	if (callback1) callback1();

	value = value || 12;

	$elem.smoothAnimate({
		value: [0, value]
	}, {
		duration: duration,
		step: function(p, e, v) {
			if ($.supp.cssFilter) e.style[$.supp.cssFilter] = 'blur(' + v + 'px)';
		},
		complete: function() {
			if (callback2) callback2();
		}
	});
}

/**
 * UnBlur $elem
 * @author Pavel Marhaunichy
 * @param {object}   $elem      jQuery object
 * @param {number}   duration   Animation duration
 * @param {function} callback1  Pre-callback
 * @param {function} callback2  Post-callback
 * @param {number}   [value=12] Blur value in px
 */
function unBlurElem($elem, duration, callback1, callback2, value) {
	if (callback1) callback1();

	value = value || 12;

	$elem.smoothAnimate({
		value: [value, 0]
	}, {
		duration: duration,
		step: function(p, e, v) {
			if ($.supp.cssFilter) e.style[$.supp.cssFilter] = 'blur(' + v + 'px)';
		},
		complete: function() {
			if (callback2) callback2();
		}
	});
}

/**
 * Modal window vars
 */

var $modal = $('#modal'),
	$modalContent = $modal.find('.modal__content'),
	$overlay = $('.overlay'),
	$preloader = $('.preloader'),
	timer = 400;

/**
 * Show preloader function
 * @author Pavel Marhaunichy
 * @param {Boolean}  overlay  Show Overlay. Default: true
 * @param {Number}   timer    Timer for overlay fadeIn effect. Default: 400
 * @param {Number}   timer2   Timer for preloader fadeIn effect. Default: 0
 * @param {function} callback Callback function will be executed after show preloader
 */
function showPreloader(overlay, timer, timer2, callback) {

	var overlay = overlay !== undefined ? overlay : true,
		timer = timer || 400,
		timer2 = timer2 || 0;

	if (overlay) {
		//show overlay, then preloader
		$overlay.fadeIn(timer, function() {
			$preloader.fadeIn(timer2, function() {
				if (callback) callback();
			});
		});

	} else {
		//show only preloader
		$preloader.fadeIn(timer2, function() {
			if (callback) callback();
		});
	}
}

/**
 * Close preloader function
 * @author Pavel Marhaunichy
 * @param {Number}   timer    Timer for preloader fadeOut effect. Default: 0
 * @param {Function} callback Callback function will be executed after close preloader
 */
function closePreloader(timer, callback) {

	var timer = timer || 0;

	/*if ($preloader.css('display') === 'block') {*/
	$preloader.fadeOut(timer, function() {
		if (callback) callback();
	});
	/*} else */
	if ($preloader.length === 0) {
		//preloader not found, so just run callback
		if (callback) callback();

	}
}


/**
 * Open Modal Window
 * @author Pavel Marhaunichy
 * @param {Object|String} content Object|String to show in modal window
 * @param {String}        type    Data type: image|video|text. Defaut: text
 * @param {Boolean}       spinner Show preloader. Default: true
 */
function showModal(content, type, spinner, timer, timer2, overlay) {

	spinner = spinner !== undefined ? spinner : false;
	timer = timer || 400;
	timer2 = timer2 || 200;
	overlay = overlay !== undefined ? overlay : true;


	//$modal.off('modal');
	$modal.trigger('modal.open');


	//clear for sure
	//closeModal();
	clearModal();


	if (overlay) {
		$overlay.fadeIn(timer, function() {
			if (spinner) {
				$preloader.fadeIn(timer2, function() {
					showModalMain();
				});
			} else {
				showModalMain();
			}
		});
	} else {
		if (spinner) {
			$preloader.fadeIn(timer2, function() {
				showModalMain();
			});
		} else {
			showModalMain();
		}
	}


	/*if (spinner) {
	 showPreloader(true, 400, 0, showModalMain);
	 return;
	 }*/


	function showModalMain() {

		//add content to modal
		$modalContent.append(content);


		switch (type) {

			case 'image':
				$(content)
					.load(function() {

						//disable preloader
						closePreloader(200, function() {

							var w = $modal.width(),
								h = $modal.height();

							//show modal window
							$modal.fadeIn(timer, function() {
								$(this).trigger('modal.opened');
							});

							setModalSize(w, h);

						});
					})
					.error(function() {
						//disable preloader
						closePreloader(200, function() {
							showModal('Something went wrong.\nPlease try again', '', false);
						});
					});
				break

			case 'video':

				var video = $modal.find('.modal__video')[0],
					src = $(video).attr('src');

				video.onerror = function() {
					console.error('error occurred');
				}

				if (/.*youtube\.com.*/i.test(src) || /.*vimeo\.com.*/i.test(src)) {
					//disable preloader
					closePreloader(200, function() {

						var w = 16,
							h = 9;

						//show modal window
						$modal.fadeIn(timer, function() {
							$(this).trigger('modal.opened');
						});
						setModalSize(w, h);

					});
				} else {
					video.oncanplay = function() {

						//disable preloader
						closePreloader(200, function() {

							var w = video.videoWidth,
								h = video.videoHeight;

							//show modal window
							$modal.fadeIn(timer, function() {
								$(this).trigger('modal.opened');
							});
							setModalSize(w, h);

						});
					}
				}
				break

			case 'mockup':

				var video = $modal.find('.modal-mockup__video')[0],
					srcEl = video.querySelector('source'),
					src = srcEl.getAttribute('src');

				//video errors handler
				$(srcEl).on('error', function() {
					console.error('error occurred');
					closePreloader(600, function() {
						$('<span class="modal__text">An error occurred. Please try again</span>').insertAfter(video);
						$(video).remove();
					});
				});

				$(video).on('canplay', function() {
					//disable preloader
					closePreloader(200, function() {

						var w = video.videoWidth,
							h = video.videoHeight;

						//show modal window
						//$modal.fadeIn(timer);
						//setModalSize(w, h);

					});
				});

				$modal.find('.modal-mockup__img')
					.load(function() {

						var w = $modal.width(),
							h = $modal.height();

						//show modal window
						$modal.fadeIn(timer, function() {
							$(this).trigger('modal.opened');
						});

						setModalSize(w, h);

					});
				break
			case "custom": // custom modal type. show content in the middle of the screen.
				$modal = $('#modal');

				var w = $modal.width(),
					h = $modal.height();

				//disable preloader
				closePreloader(200, function() {
					//show modal window
					$modal.fadeIn(timer, function() {
						$(this).trigger('modal.opened');
					});
					$modal.css({
						top: (vpHeight - h) / 2 + 'px',
						left: (body.clientWidth - w) / 2 + 'px'
					});
				});
				break;

			default:
				//wrap text
				$modalContent.wrapInner('<span class="modal__text"></span>');

				$modal = $('#modal');

				var w = $modal.width(),
					h = $modal.height();

				//disable preloader
				closePreloader(200, function() {
					//show modal window
					$modal.fadeIn(timer, function() {
						$(this).trigger('modal.opened');
					});
					setModalSize(w, h, false);
				});
		}
	}

	//showModalMain();
}

function clearModal() {
	$modal.css({
		'display': 'none',
		'width': 'auto',
		'height': 'auto',
		'line-height': 'normal'
	});
	$modalContent.empty();
}

/**
 * Close modal window
 * @author Pavel Marhaunichy
 */
function closeModal() {
	$modal.trigger('modal.close');

	$modal.add($overlay).smoothAnimate({
		opacity: 0,
		value: [1, 2]
	}, {
		duration: timer,
		step: function(p, e, v) {
			//e.style.transform = 'scale(' + v + ')';
		},
		complete: function(elems) {
			$overlay.css({
				'display': 'none',
				//'transform': 'scale(1)',
				'opacity': .4
			});
			$modal.css({
				'display': 'none',
				//'transform': 'scale(1)',
				'opacity': 1,
				'width': 'auto',
				'height': 'auto',
				'line-height': 'normal'
			});
			$modalContent.empty();

			$modal.trigger('modal.closed');

			//unbind handlers
			//$modal.off('modal');

		}
	});


	//disable preloader
	closePreloader();


}
$overlay.add($('.modal__close')).on('click', function() {
	closeModal();
});


/**
 * Set modal window position, width & height
 * @author Pavel Marhaunichy
 * @param {Number} w          - Element width
 * @param {Number} h          - Element height
 * @param {number} [ratio=70] Scale of modal window in relation to screen in %
 */
function setModalSize(w, h, ratio) {
	var ww = body.clientWidth,
		wh = vpHeight,
	//screen ratio
		sr = ww / wh,
	//element ratio
		er = w / h,
	//percents of screen
		ratio = ratio != undefined ? ratio / 100 : 70 / 100;


	if ($modal.find('.modal__text').length) {
		var top = Math.round((wh - h) / 2),
			left = Math.round((ww - w) / 2);

		$modal.css({
			'width': w + 'px',
			'height': h + 'px',
			'top': top + 'px',
			'left': left + 'px',
		});

		return;
	}

	if (sr >= er) {

		//Math
		var height = Math.round(wh * ratio),
			width = Math.round(height * er),
			top = Math.round((wh - height) / 2),
			left = Math.round((ww - width) / 2);

		$modal.css({
			'width': width + 'px',
			'height': height + 'px',
			'top': top + 'px',
			'left': left + 'px',
			//'line-height': height + 'px'
		});

	} else {

		//Math
		var width = Math.round(ww * ratio),
			height = Math.round(width / er),
			top = Math.round((wh - height) / 2),
			left = Math.round((ww - width) / 2);

		$modal.css({
			'width': width + 'px',
			'height': height + 'px',
			'top': top + 'px',
			'left': left + 'px',
			//'line-height': height + 'px'
		});
	}
}

//Resize modal window on resize
function updateModalSize() {
	if ($modal.css('display') === 'block') {
		$modal.css('width', '');
		$modal.css('height', '');
		var w = $modal.width(),
			h = $modal.height();
		setModalSize(w, h);
	}
}


var $previwStoryBtn = $('.js-preview-storyworld');

$previwStoryBtn.on('click', function(e) {
	e.preventDefault();
	blurElem($wrapper, 700);

	showModal(
		'<img class="modal-mockup__img" src="assets/img/iphone.png"><video class="modal-mockup__video" autoplay loop muted><source src="//likeaprothemes.com/themes/html/nowadays/preview/assets/video/working-process.mp4"></video>',
		'mockup', true);

	$modal.one('modal.close', function() {
		unBlurElem($wrapper, 700);

	});
});


/**
 * Discover Storyworlds
 */

function fullPage() {

	var fullPageWrapper = document.querySelector('.fullpage');

	if (!fullPageWrapper) return;

	var firstRun = false,
		fullPageSection = fullPageWrapper.querySelectorAll('section:not(.fp-auto-height)'),
		fullPageVpHeight;

	var fullPageNext = fullPageWrapper.querySelector('.js-fp-next'),
		fullPageClose = fullPageWrapper.querySelector('.js-fp-close'),
		fullPageDots;

	//define footer's destination
	var footerInSection = false;

	function fullPageNextSlide() {
		$.fn.fullpage.moveSectionDown();
	}

	function fullPageDestroy() {
		$(fullPageWrapper).addClass('destroying');

		setTimeout(function() {
			//destroy plug + remove its handlers
			$.fn.fullpage.destroy('all');
			fullPageClose.removeEventListener('click', fullPageDestroy, false);
			fullPageNext.removeEventListener('click', fullPageNextSlide, false);

			$(fullPageWrapper).removeClass('destroying');

		}, 1200); //equals to CSS .destroying transition time

		//remove controls
		$(fullPageNext)
			.add(fullPageClose)
			.removeClass('visible');

	}

	function lazyLoadBg(section) {
		var elems = section.querySelectorAll('div[data-source], img[data-source]');

		if (!elems.length) return;

		for (var i = 0; i < elems.length; i++) {
			if ('div' === elems[i].tagName.toLowerCase() && getComputedStyle(elems[i]).backgroundImage === 'none') {
				elems[i].style.backgroundImage = 'url(' + elems[i].getAttribute('data-source') + ')';
			} else if ('img' === elems[i].tagName.toLowerCase()) {
				elems[i].onload = function() {
					//it is reauires for scrollable areas at least
					$(window).resize();
				};
				elems[i].src = elems[i].getAttribute('data-source');
			}
		}
	}

	//fp controls handler
	if (isHomePage) {
		fullPageNext.addEventListener('click', fullPageNextSlide, false);
		fullPageClose.addEventListener('click', fullPageDestroy, false);
	}

	$(fullPageWrapper).fullpage({
		//Navigation
		menu: false, // menu selector
		lockAnchors: false,
		anchors: [],
		navigation: true,
		navigationPosition: 'right',
		navigationTooltips: [],
		showActiveTooltip: false,
		slidesNavigation: true,
		slidesNavPosition: 'bottom',

		//Scrolling
		css3: false,
		scrollingSpeed: 1200,
		autoScrolling: true,
		fitToSection: true,
		fitToSectionDelay: 1000,
		scrollBar: false,
		easing: 'easeInOutQuart',
		easingcss3: 'ease',
		loopBottom: false,
		loopTop: false,
		loopHorizontal: true,
		continuousVertical: false,
		//normalScrollElements: '.scrollable',
		scrollOverflow: false,
		scrollOverflowOptions: null,
		touchSensitivity: 15,
		normalScrollElementTouchThreshold: 5,
		bigSectionsDestination: null,

		//Accessibility
		keyboardScrolling: true,
		animateAnchor: true, // obviously true, useless option
		recordHistory: true, //

		//Design
		controlArrows: true,
		verticalCentered: false, // vert middle dib
		//sectionsColor: ['#ccc', '#fff'],
		//paddingTop: '3em',
		//paddingBottom: '10px',
		fixedElements: '.header, .footer',
		responsiveWidth: 0,
		responsiveHeight: 0,

		//Custom selectors
		sectionSelector: '.section',
		slideSelector: '.slide',

		//events
		onLeave: function(index, nextIndex, direction) {

			//prevent change until the current animation is not finished
			if (!$(fullPageSection[index - 1]).hasClass('fp-completely')) {
				return false;
			}

			lazyLoadBg(fullPageSection[nextIndex - 1]);

			if (isHomePage) {
				//fix for proper animation of send app store link btn.
				var sendAppLinkBtn = $('#sendAppStoreLinkBtn');
				var sendAppLinkInputAddress = $('#sendAppStoreLinkInputEmail');
				sendAppLinkInputAddress.val('');
				sendAppLinkBtn
					.removeClass("home-section-8-form-get-link__btn__disabled home-section-8-form-get-link__btn__enabled")
					.addClass("home-section-8-form-get-link__btn");

				//if next slide with scrollable area - temp. disable autoscrolling
				var scrollable = fullPageSection[nextIndex - 1].querySelector('.scrollable');
				if (scrollable) {

					//disable scrolling until slide is loaded to avoid unpleasant situations
					scrollable.style.zIndex = 0;

					//to make possible scroll up
					scrollable.scrollTop = 1;

					//timeOut, cuz without it doesn't work for 1st run's 1st slide
					setTimeout(function() {
						$.fn.fullpage.setAllowScrolling(false);
					}, 50);

				} else {
					//it seems like sometimes it will be need
					$.fn.fullpage.setAllowScrolling(true);
				}
			}

			if (isDiscoverPage) {
				//autoplay for discover page
				sliderTimeout.currentItem = nextIndex - 1;
				sliderTimeout.resetProgress();
			}

			var lastHeight = fullPageWrapper.offsetHeight,
				inlineStyles = document.getElementById('fp-inline-styles-2');

			if (inlineStyles) {
				var inlineStylesParent = inlineStyles.parentNode;
				inlineStylesParent.removeChild(inlineStyles);
			}

			var sheet = document.createElement('style');
			sheet.id = 'fp-inline-styles-2';

			if ('down' === direction) {
				sheet.innerHTML =
					'.fp-section.fp-completely:not(.active) {z-index:3;}.fp-section.active:not(.fp-completely) {z-index:2;}';

			} else {
				sheet.innerHTML =
					'.fp-section.active:not(.fp-completely) {z-index:3;}.fp-section.fp-completely:not(.active) {z-index:2;}';
			}

			head.appendChild(sheet);

			if (nextIndex === fullPageSection.length) {
				//hide nextArrow for the last slide
				if (isHomePage) {
					$(fullPageNext).removeClass('visible');
				}

				//footer fix
				if (!footerInSection) {

					//if it's discover page
					if (isDiscoverPage && !$('.tabs__link[href="#storyworlds"]').hasClass('tabs__link_active')) {
						return;
					}

					//var footerHeight = footer.offsetHeight;
					var footerHeight = $(footer).height(); //JQ - cuz footer is display:none
					$(footer).appendTo(fullPageSection[nextIndex - 1]);
					fullPageSection[nextIndex - 1].querySelector('.js-fp-section-wrapper').style.height =
						lastHeight - footerHeight + 'px';
					footerInSection = true;
				}
			}

		},
		afterLoad: function(anchorLink, index) {

			//a little bit plugin improvments
			$.fn.fullpage.currentSection = index;

			var scrollable = fullPageSection[index - 1].querySelector('.scrollable');
			if (scrollable) {
				//restore z-index for scrollable element, cuz section is ready
				scrollable.style.zIndex = 1;
			}

			//homepage fixes
			if (isHomePage) {
				if (firstRun && 1 === index) {
					//reset opacity for all sections which it had
					for (var i = 1; i < fullPageSection.length; i++) {
						fullPageSection[i].style.opacity = '';
					}
					firstRun = false;
				}
			}

			if (index !== fullPageSection.length) {
				//nextArrow
				if (isHomePage) {
					$(fullPageNext).addClass('visible');
				}

				//footer fix
				if (footerInSection) {
					$(footer).appendTo($wrapper);
					fullPageSection[fullPageSection.length - 1].querySelector('.js-fp-section-wrapper').style.height = '';
					footerInSection = false;
				}

			}
		},
		afterRender: function() {

			//homepage fixes
			if (isHomePage) {
				firstRun = true;
				//set slide #2 as default
				$.fn.fullpage.silentMoveTo(2);
				//hide all section, except 0 (1st) at init
				for (var i = 1; i < fullPageSection.length; i++) {
					fullPageSection[i].style.opacity = 0;
				}
				//move to 1st slide with normal animations
				$.fn.fullpage.moveTo(1);

				//closeBtn
				$(fullPageClose).addClass('visible');
			}

			fullPageCorrections();

			//dots
			setTimeout(function() {
				//without timeOut it doesn't work properly
				$(fullPageDots).addClass('visible');
			}, 5);

		},
		afterResize: function() {
			fullPageCorrections();
		},
		afterSlideLoad: function(anchorLink, index, slideAnchor, slideIndex) {
		},
		onSlideLeave: function(anchorLink, index, slideIndex, direction, nextSlideIndex) {
		}
	});


	/**
	 * FullPage.JS crutches
	 * use for first run and resize event
	 * @author Pavel Marhaunichy
	 */
	function fullPageCorrections() {
		var topOffset = fullPageWrapper.getBoundingClientRect().top;
		fullPageVpHeight = vpHeight - topOffset;
		$.fn.fullpage.height = fullPageVpHeight;

		/**
		 * Markup correction
		 */
		if (firstRun || isDiscoverPage) {
			fullPageDots = document.getElementById('fp-nav');
			fullPageWrapper.appendChild(fullPageDots);
		}

		/**
		 * Height correction
		 */
		//wrapper
		fullPageWrapper.style.height = fullPageVpHeight + 'px';
		//sections
		for (var i = 0; i < fullPageSection.length; i++) {
			fullPageSection[i].style.height = fullPageVpHeight + 'px';
		}

		/**
		 * Styles correction
		 */
		//remove firstly, if exists
		var inlineStyles = document.getElementById('fp-inline-styles');
		if (inlineStyles) {
			var inlineStylesParent = inlineStyles.parentNode;
			inlineStylesParent.removeChild(inlineStyles);
		}
		//create new
		var sheet = document.createElement('style');
		sheet.id = 'fp-inline-styles';
		sheet.innerHTML =
			'.fp-section.fp-completely:not(.active) {' + $.supp.cssTransform3d + ':translate3d(0, -' + fullPageVpHeight +
			'px, 0);}';
		sheet.innerHTML +=
			'.fp-section.active:not(.fp-completely) {top:-' + fullPageVpHeight + 'px;' + $.supp.cssTransform3d +
			':translate3d(0, ' +
			fullPageVpHeight + 'px, 0);}';
		head.appendChild(sheet);

	}


	/**
	 * Discover Storyworlds slider timer
	 * @author Pavel Marhaunichy
	 */

	var sliderTimeout = {
		//can be changed
		autoplayTimeout: 6000,
		items: fullPageSection,
		itemsCount: fullPageSection.length,
		navItems: document.getElementById('fp-nav').getElementsByTagName('a'),
		timelineRadius: 5,
		//cannot be changed
		start: null,
		prevItem: null,
		nextItem: 1,
		currentItem: 0,
		currentTimeline: null,
		progress: 0,

		init: function() {
			this.prepare();
			this.goToSlide(0);
			this.loop();
			this.setHandlers();
		},

		prepare: function() {

			var $svg = $(
				'<svg width="14" height="14"><circle class="storyworld__timeline" r="5" cx="7" cy="7" stroke-dasharray="31.41" stroke-dashoffset="31.41" stroke-width="2" fill="none" transform="rotate(-90 7 7)"></circle></svg>');
			$(this.navItems).append($svg);

		},

		goToSlide: function(i) {

			$.fn.fullpage.moveTo(i + 1);

			//firstly
			this.currentItem = i;
			//then
			this.resetProgress();
		},

		/*
		 prevSlide: function () {
		 this.nextItem = this.currentItem;
		 this.prevItem = this.currentItem;

		 this.goToSlide(--this.currentItem >= 0 ? this.currentItem-- : itemsCount - 1);
		 },*/

		nextSlide: function() {
			this.prevItem = this.currentItem;
			this.nextItem = ++this.currentItem < this.itemsCount ? this.currentItem++ : 0;

			this.goToSlide(this.nextItem);
		},

		loop: function(timeStamp) {
			var _this = this,
				timePassed = timeStamp - this.startTime;

			if (timePassed > this.autoplayTimeout) timePassed = this.autoplayTimeout;

			//set progress
			this.progress = timePassed * 100 / this.autoplayTimeout;

			this.timeline();

			if (timePassed >= this.autoplayTimeout) this.nextSlide();

			requestAnimationFrame(function(timeStamp) {
				_this.loop(timeStamp);
			});
		},

		timeline: function() {
			var circumference = 2 * Math.PI * this.timelineRadius;
			this.currentTimeline.style.strokeDashoffset = circumference - (this.progress * circumference / 100);
		},

		resetProgress: function() {
			this.startTime = performance.now();
			this.currentTimeline = this.navItems[this.currentItem].querySelector('.storyworld__timeline');
		},

		setHandlers: function() {
		},

	};
	//after plugin's call
	if (isDiscoverPage) sliderTimeout.init();

}
/**
 * Some method to decorate elements with "data-background-image" property by background image.
 */
function setBgImageFromData() {
	var el = document.querySelectorAll('[data-background-image]');
	for (var i = 0; i < el.length; i++) {
		if (getComputedStyle(el[i]).backgroundImage === 'none') el[i].style.backgroundImage =
			'url(' + el[i].getAttribute('data-background-image') + ')';
	}
}

/**
 * Fetch story worlds from server then display it.
 */
function fetchThenDisplayStoryWorlds() {
	/**
	 * Display story worlds data.
	 * @param templateResponse response with template of tile to display story world.
	 * @param storyWorldsResponse story worlds data response.
	 */
	function displayStoryWorlds(templateResponse, storyWorldsResponse) {
		storyWorldsResponse[0].storyWorlds.forEach(function(sw) {
			sw.seasonText = sw.seasons > 1 ? "Seasons" : "Season";
			sw.episodeText = sw.episodes > 1 ? "Episodes" : "Episode";
		});
		var rendered = Mustache.render(templateResponse[0], storyWorldsResponse[0]);
		$('#storyworlds').html(rendered);
		setBgImageFromData();
		fullPage();
	}

	/**
	 * Handle error when template or data has not been fetched.
	 * @param templateResponse error object, if equal with "error" string then no error.
	 * @param dataResponse error object, if equal with "error" string then no error.
	 */
	function errorHandler(templateResponse, dataResponse, fdsf) {
		if (templateResponse != "error")
			console.error("Unable to load story world discovery tile template with info: " + JSON.stringify(templateResponse));
		if (dataResponse != "error")
			console.error("Unable to fetch discovery story world data with info: " + JSON.stringify(dataResponse));
	}

	/**
	 * Fetch story world tile template and story worlds data and display it if success otherwise log errors at console.
	 */
	function fetchStoryWorlds() {
		$.when($.ajax('assets/templates/discover/storyWorld.html'),
			$.ajax({
				url: '/api/discover'
			})
		).then(displayStoryWorlds, errorHandler);
	}

	$(document).ready(function() {
		fetchStoryWorlds();
	});
}

//run immidetly for DiscoverPage
//for Home it will be triggered
if (isDiscoverPage)
	fetchThenDisplayStoryWorlds();

//some init stuff for story world details page.
if (isStoryWorldDetails) {
	$(document).ready(function() {
		setBgImageFromData();
		fullPage();
		initSynopsis();
	});
}

/**
 * Check if an element is visible on current viewport
 * @author Pavel Marhaunichy
 * @param   {Number}         elTopOffset Element offset from the top of document
 * @param   {Number}         elHeight    Element height value
 * @returns {Number|boolean} Returns the percentage of the visible part of an element
 *                           OR false if element is not visible on current viewport
 */
function isVisible(elTopOffset, elHeight) {

	if (elTopOffset + elHeight > _scroll && elTopOffset < _scroll + vpHeight) {

		var visible;

		//element in viewport
		if (_scroll >= elTopOffset) {
			//element beyond the top of the screen
			visible = 100 - Math.ceil((_scroll - elTopOffset) * 100 / elHeight); // % of element can be seen at the top of the screen

		} else if (elTopOffset < _scroll + vpHeight && elTopOffset + elHeight > _scroll + vpHeight) {
			//element began to appear at the bottom of the screen
			//and element is not yet fully shown
			visible = 100 - Math.ceil(((elTopOffset + elHeight) - (_scroll + vpHeight)) * 100 / elHeight); // % of element can be seen at the bottom of the screen
		} else {
			//element fully visible
			visible = 100;
		}

		return visible;

	}

	return false;
}


/**
 * Blur on scroll
 * Call on background element which should be blurred
 * @author Pavel Marhaunichy
 * @param   {object}   scrollableEl Element which have scroll area (Raw DOM)
 * @param   {object}   options      Object with options
 * @param   {function} callback1    Fired when we at the top position (percent offset see in the code)
 * @param   {function} callback2    Fired when we at the bottom position (percent offset see in the code)
 * @returns {object}   jQuery object
 */
$.fn.blurOnScroll = function(scrollableEl, options, callback1, callback2) {
	if (!this.length || !$(scrollableEl).length) return;

	options = $.extend({
		blurStart: 0,
		blur: 10,
		zoom: 0
	}, options);

	var _this = this[0],
		scroll = 0,
		scrollableElHeight = scrollableEl.offsetHeight,
		scrollableElFullHeight = scrollableEl.scrollHeight;


	var ev = $._data(scrollableEl, 'events');
	if (!ev || (ev && !ev.scroll)) {
		$(scrollableEl).on('scroll', onScroll);
	}
	$(window).on('resize', onResize);


	var lastScroll;

	/**
	 * [[Description]]
	 * @author Pavel Marhaunichy
	 */
	function onScroll() {
		scroll = scrollableEl.scrollTop;

		var scrolled = isScrolled(scroll, scrollableElHeight, scrollableElFullHeight),
			value = options.blurStart + scrolled * (options.blur - options.blurStart) / 100;

		if (options.blur >= 0) { //false case poss as well
			_this.style[$.supp.cssFilter] = 'blur(' + value + 'px)';
		}

		if (options.zoom) {
			var zoomValue = 1 + ((options.zoom - 1) * scrolled / 100);
			$.supp.cssTransform3d ? _this.style[$.supp.cssTransform3d] = 'scale3d(' + zoomValue + ',' + zoomValue + ',1)' :
				_this.style[$.supp.cssTransform2d] = 'scale(' + zoomValue + ')';
		}


		//callback's time
		if (scrollableEl.scrollTop < 1) {
			//to avoid multiple callbacks
			if (lastScroll !== scroll && callback1) callback1(_this);
		} else if (scrollableElFullHeight - scrollableEl.scrollTop - scrollableElHeight < 1) {
			//to avoid multiple callbacks
			if (lastScroll !== scroll && callback2) callback2(_this);
		}

		lastScroll = scroll;
	}

	onScroll();

	/**
	 * [[Description]]
	 * @author Pavel Marhaunichy
	 */
	function onResize() {
		scrollableElHeight = scrollableEl.offsetHeight;
		scrollableElFullHeight = scrollableEl.scrollHeight;
	}

	/**
	 * Check how much element scrolled
	 * @author Pavel Marhaunichy
	 * @param   {number}         scroll                 ScrollTop pos i nscrollable element
	 * @param   {number}         scrollableElHeight     Scrollable elem height
	 * @param   {number}       scrollableElFullHeight Scrollable elem full height
	 * @returns {number} Returns the percentage value
	 */
	function isScrolled(scroll, scrollableElHeight, scrollableElFullHeight) {
		var percentage = scroll * 100 / (scrollableElFullHeight - scrollableElHeight);
		return percentage;
	}

	return this;

};


/**
 * About page blur callfullpage
 */
$('.about .section__bg').blurOnScroll(document.querySelector('.about__inner'), {
	blurStart: 3,
	blur: 12,
	zoom: 1.08
});


/**
 * Homeage bg canvas animation
 * run only on pretty strong devices
 * @author Pavel Marhaunichy
 */
if (vpWidth >= 768) {
	$('.canvas__bg').particleground({
		dotColor: '#fff',
		lineColor: '#fff'
	});
}


/**
 * Register handler
 * @author Pavel Marhaunichy
 */
$('.js-create-btn').on('click', function() {
	var $registerContainer = $('#register'),
		$section = $('.create'),
		$createInner = $section.find('.create__inner');

	$modal.one('modal.open', function() {
		$createInner.fadeOut();
		//set custom opacity
		$overlay.css('opacity', .8);

		if (isMobile) {
			//overlay appearing time
			setTimeout(function() {
				$registerContainer.fadeIn(800);
			}, timer);
		} else {
			$registerContainer.fadeIn(800);
		}

		blurElem($section, 400, null, function() {
		}, 5);
	});

	$modal.one('modal.close', function() {
		$createInner.fadeIn();
		unBlurElem($section, 400, null, function() {
			$registerContainer
			//retutn to initial location
				.appendTo($wrapper)
				.css('display', 'none');
			//reset custom opacity
			$overlay.css('opacity', '');
		}, 5);
	});

	showModal($registerContainer, 'text', false, null, null, isMobile ? true : false);
});

/**
 * Resend forgot password handler
 */
$('.js-forgot-btn-resend').on('click', function() {
	var $registerContainer = $('#register'),
		$section = $('.create'),
		$createInner = $section.find('.create__inner');

	$modal.one('modal.open', function() {
		$createInner.fadeOut();
		//set custom opacity
		$overlay.css('opacity', .8);

		if (isMobile) {
			//overlay appearing time
			setTimeout(function() {
				$registerContainer.fadeIn(800);
			}, timer);
		} else {
			$registerContainer.fadeIn(800);
		}

		blurElem($section, 400, null, function() {
		}, 5);
	});

	$modal.one('modal.close', function() {
		$createInner.fadeIn();
		unBlurElem($section, 400, null, function() {
			$registerContainer
			//retutn to initial location
				.appendTo($wrapper)
				.css('display', 'none');
			//reset custom opacity
			$overlay.css('opacity', '');
		}, 5);
	});

	showModal($registerContainer, 'text', false, null, null, isMobile ? true : false);
});


/**
 * Get app handler
 * @author Pavel Marhaunichy
 */
$('.js-get-app-btn').on('click', function(e) {
	e.preventDefault();

	$modalContent.load('get-app-popup.html', function() {

		var $popup = $(this).find('#get-app-popup');

		var video = $popup[0].querySelector('video');

		//cuz autoplay not works for some reason
		video.oncanplay = function() {
			video.play();
		}

		$modal.one('modal.open', function() {
			$overlay.css('opacity', .9);
			$popup.fadeIn(800);
		});

		$modal.one('modal.opened', function() {
			getAppPopupHandler();

			updateModalSize();

			//cuz autoplay not works for some reason
			if (video.readyState > 2) {
				video.play();
			}
		});

		$modal.one('modal.close', function() {
			$overlay.css('opacity', '');
		});

		showModal($popup, 'text', false, null, null, true, 0.8);
	});
});

function getAppPopupHandler() {
	var $getAppPopupForm = $('.get-app-popup-form');

	$getAppPopupForm.submit(function(e) {
		var email = $(this).find(":input[name='email']").first().val();
		var onSuccess = function() {
			$getAppPopupForm[0].reset();
			var view = '<div>' +
				'<div class="information_modal__text">Your link was successfully sent</div>' +
				'</div>';
			showModal(view, 'custom', false);
			setTimeout(function() {
				closeModal();
			}, 3000);
		};

		var onError = function() {
			var view = '<div class="information_modal__text">Your link was successfully sent</div>';
			showModal(view, 'custom', false);
		};

		$.ajax({
			method: 'POST',
			contentType: 'application/json; charset=UTF-8',
			url: '/api/oolipo/send_app_link',
			data: JSON.stringify({
				email: email
			})
		}).then(onSuccess, onError);
		e.preventDefault();
		return false;
	});
}

/**
 * HOME BUTTON
 * @author Pavel Marhaunichy
 */
(function() {
	var btn = document.querySelector('.js-home-main-btn');

	if (!btn) return;

	var timeline = btn.querySelector('.home-main-btn__timeline');

	var button = {
		r: timeline.getAttribute('r'),
		startTime: 0,
		timelimit: 1000,
		timePassed: 0,
		progress: 0,
		id: null,

		start: function() {
			this.startTime = performance.now();
			this._loop();
		},

		_loop: function(timeStamp) {
			var _this = this;

			this.timePassed = timeStamp - this.startTime;

			if (this.timePassed >= this.timelimit) {
				this.timePassed = this.timelimit;
				this.complete();
			}

			this.progress = this.timePassed * 100 / this.timelimit;

			this._render();

			if (this.timePassed >= this.timelimit) return;

			this.id = requestAnimationFrame(function(timeStamp) {
				_this._loop(timeStamp);
			});
		},

		check: function(ts) {
			if (ts < this.startTime + this.timelimit) this.stop();
		},

		stop: function() {
			cancelAnimationFrame(this.id);
			this.startTime = 0;
			this.progress = 0;
			this._render();
		},

		_render: function() {
			var circumference = 2 * Math.PI * this.r;
			timeline.style.strokeDashoffset = circumference - (this.progress * circumference / 100);
		},

		complete: function(func) {
			this.stop();
			if (func) func();
			$(btn).trigger('button.complete');
		}

	};

	$(btn)
		.on('mousedown touchstart', function(e) {

			//bind on whole document, cuz we can
			//complete event on another element => full progress
			$(document).one('mouseup touchend', function(e) {
				var ts = performance.now();
				//to reset timeline
				button.startTime = ts;

				button.check(ts);

				$._data(btn, {
					'started': null
				});
			});

			//to prevent mulltiple events
			if ($._data(this, 'started')) return;

			$._data(this, {
				'started': true
			});

			//go ahead!
			button.start();

		})
		.on('button.complete', function() {
			fullPage();
		});


}());


/**
 * Handle scrollable areas within fullpage
 * @author Pavel Marhaunichy
 */
var scrollableSections = document.querySelectorAll('.scrollable');

for (var i = 0; i < scrollableSections.length; i++) {
	var $bg = $(scrollableSections[i]).siblings('.section__bg');

	$bg.blurOnScroll(scrollableSections[i], {
		blur: i === 0 ? false : 10 //no blur for 1st section
	}, function() {
		//up direction
		//exclude 1st section from this, cause it works not properly
		if ($.fn.fullpage.currentSection !== 1) {
			//plugin can be not ready yet
			try {
				$.fn.fullpage.moveSectionUp();
			} catch (e) {
			}
		}
	}, function() {
		//down direction
		//plugin can be not ready yet
		try {
			$.fn.fullpage.moveSectionDown();
		} catch (e) {
		}
	});
}


/**
 * Filter on discovwer page
 * @author Pavel Marhaunichy
 */
if (isDiscoverPage) {

	//instances storage
	var isos = {};

	(function() {

		//show hidden tabs content before and restore after plugin init
		//			var temp = document.querySelectorAll('.tabs__link'),
		//				temp2 = [];
		//
		//			for (var i = 0; i < temp.length; i++) {
		//				var hash = temp[i].href.split('#')[1];
		//				var tabContent = document.getElementById(hash);
		//
		//				if (getComputedStyle(tabContent).display === 'none') {
		//					tabContent.style.display = 'block';
		//					temp2.push(tabContent);
		//				}
		//			}

		var isoContainers = document.querySelectorAll('.isotope-wrapper');

		// init IsotopeS
		for (var i = 0; i < isoContainers.length; i++) {
			isos[i] = new Isotope(isoContainers[i], {
				itemSelector: '.col-2',
				//layoutMode: 'fitRows',
				masonry: {
					columnWidth: '.col-2'
				}
			});
		}

		// bind filter click for each object instance
		var filtersElem = document.querySelectorAll('.filter');
		for (var n = 0; n < filtersElem.length; n++) {
			filtersElem[n].addEventListener('click', function(event) {

				var id = $(filtersElem).index(this);

				// only work with buttons
				if (!matchesSelector(event.target, '.filter__item')) {
					return;
				}
				var filterValue = event.target.getAttribute('data-filter');
				// use matching filter function
				filterValue = filterValue;
				isos[id].arrange({
					filter: filterValue

				}, false);
			});
		}

		// change is-checked class on buttons
		var buttonGroups = document.querySelectorAll('.filter');
		for (var i = 0, len = buttonGroups.length; i < len; i++) {
			var buttonGroup = buttonGroups[i];
			setClasses(buttonGroup);
		}

		function setClasses(buttonGroup) {
			buttonGroup.addEventListener('click', function(event) {
				// only work with buttons
				if (!matchesSelector(event.target, '.filter__item')) {
					return;
				}
				buttonGroup.querySelector('.filter__item_active').classList.remove('filter__item_active');
				event.target.classList.add('filter__item_active');
			});
		}

		//restore display
		//	for (var i = 0; i < temp2.length; i++) {
		//		temp2[i].style.display = 'none';
		//	}


		//or

		//more easier way :)
		document.querySelector('.tabs').addEventListener('click', function(e) {
			if ($(e.target).hasClass('tabs__link')) {
				rebuildIsotope();
			}
		}, false);


	}());

}

function rebuildIsotope() {
	for (var iso in isos) {
		if (isos.hasOwnProperty(iso)) {
			isos[iso].arrange();
		}
	}
}


/**
 * Here we go!
 */

document.getElementById('p-preloader__inner').style[$.supp.animation + 'Duration'] = '1s';
setTimeout(function() {
	//home page addClass to make main screen animation
	if (isHomePage) {
		var mainScreen = document.querySelector('.home-main');
		$(mainScreen).addClass('animated');
	}
	$(document.getElementById('p-preloader')).fadeOut(1000);
}, 1000);


if (isHomePage) homeAudioBg();

function homeAudioBg() {
	var track,
		volumeBtn = document.querySelector('.home-main-topbar-volume');

	if (typeof localStorage === 'object') {
		try {
			if (!localStorage.getItem('musicWasStoped')) localStorage.setItem('musicWasStoped', 'false');

			if ('true' !== localStorage.getItem('musicWasStoped')) {
				newTrack();
			} else {
				$(volumeBtn)
					.removeClass('ico-volume')
					.addClass('ico-volume-2');
			}

		} catch (e) {
			Storage.prototype._setItem = Storage.prototype.setItem;
			Storage.prototype.setItem = function() {
			};
		}
	}

	function newTrack() {
		track = new Audio('assets/media/background.mp3');
		track.loop = true;
		track.id = 'home-audio';
		track.oncanplay = function() {
			track.play();
		}
		body.appendChild(track);
	}

	volumeBtn.addEventListener('click', function() {

		if ($(volumeBtn).hasClass('ico-volume')) {
			//playing
			track.pause();
			localStorage.setItem('musicWasStoped', 'true');

			$(volumeBtn)
				.removeClass('ico-volume')
				.addClass('ico-volume-2');
		} else {
			//stoped
			if (!track) newTrack();

			track.play();
			localStorage.setItem('musicWasStoped', 'false');

			$(volumeBtn)
				.addClass('ico-volume')
				.removeClass('ico-volume-2');
		}

	}, false);
}


/**
 * Parse given query string and return object containing pair of key - value.
 * This is part of query-string library.
 * More at: https://github.com/sindresorhus/query-string
 * @param str query string to parse
 * @return {Object} object with parsed query string pair of key - value.
 */
function parseQueryString(str) {
	// Create an object with no prototype
	// https://github.com/sindresorhus/query-string/issues/47
	var ret = Object.create(null);

	if (typeof str !== 'string') {
		return ret;
	}

	str = str.trim().replace(/^(\?|#|&)/, '');

	if (!str) {
		return ret;
	}

	str.split('&').forEach(function(param) {
		var parts = param.replace(/\+/g, ' ').split('=');
		// Firefox (pre 40) decodes `%3D` to `=`
		// https://github.com/sindresorhus/query-string/pull/37
		var key = parts.shift();
		var val = parts.length > 0 ? parts.join('=') : undefined;

		key = decodeURIComponent(key);

		// missing `=` should be `null`:
		// http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
		val = val === undefined ? null : decodeURIComponent(val);

		if (ret[key] === undefined) {
			ret[key] = val;
		} else if (Array.isArray(ret[key])) {
			ret[key].push(val);
		} else {
			ret[key] = [ret[key], val];
		}
	});

	return ret;
}

/**
 * Create register your interest data fields.
 */
var createRegisterName = null;
var createRegisterOrganisation = null;
var createRegisterEmail = null;
var createRegisterPhone = null;
/**
 * Register new creator.
 */
function registerCreator() {
	createRegisterName = $("form.register-form :input[name='registerName']").first().val();
	createRegisterOrganisation = $("form.register-form :input[name='registerFrom']").first().val();
	createRegisterEmail = $("form.register-form :input[name='registerEmail']").first().val();
	createRegisterPhone = $("form.register-form :input[name='registerPhone']").first().val();
	var sendBtn = $("#createSendBtn");
	sendBtn.attr('disabled', true);
	sendCreateRegister(createRegisterName, createRegisterOrganisation, createRegisterEmail, createRegisterPhone);
	return false;
}

/**
 * Resend create register your intereset.
 */
function resendRegisterCreator() {
	sendCreateRegister(createRegisterName, createRegisterOrganisation, createRegisterEmail, createRegisterPhone);
}

/**
 * Send crete register your interest email.
 * @param name user name.
 * @param organisation where user came from.
 * @param email user email address.
 * @param phone user phone number.
 */
function sendCreateRegister(name, organisation, email, phone) {
	var requestData = {
		name: name,
		organisation: organisation,
		email: email,
		phone: phone
	};

	var onRegistered = function() {
		showModal('<span class="information_modal__text">Your request has been registered, we will contact with you soon</span>',
			'', false);
		setTimeout(function() {
			closeModal();
		}, 3000);
	};
	var onError = function() {
		var view = '<div>' +
			'<div class="information_modal__text">Something went wrong :(</div>' +
			'<div class="p10"><a href="#" class="btn btn_xlarge btn_white btn_rounded" onclick="resendRegisterCreator()">Try again</a></div>' +
			'</div>';
		showModal(view, 'custom', false);
	};
	$.ajax({
		method: 'POST',
		contentType: 'application/json; charset=UTF-8',
		url: '/api/creator',
		data: JSON.stringify(requestData)
	}).then(onRegistered, onError);
}

/**
 * Validate email passed to send app store link and enable / disable button depends on email validation.
 */
function validateEmailForAppStoreLink() {
	var sendAppLinkInputAddress = $('#sendAppStoreLinkInputEmail');
	var sendAppLinkBtn = $('#sendAppStoreLinkBtn');
	var isEmailValid = validateEmail(sendAppLinkInputAddress.val());
	if (isEmailValid) {
		sendAppLinkBtn
			.removeAttr("disabled")
			.removeClass("home-section-8-form-get-link__btn__disabled")
			.addClass("home-section-8-form-get-link__btn__enabled");
	} else {
		sendAppLinkBtn
			.addClass("home-section-8-form-get-link__btn__disabled")
			.removeClass("home-section-8-form-get-link__btn__enabled")
			.attr("disabled", true);
	}
}

/**
 * Validate if given string is proper email formmated.
 * @param email string to validate.
 * @return {boolean} true if email is valid, false otherwise.
 */
function validateEmail(email) {
	var re = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
	return re.test(email);
}

/**
 * Validate create form data and set disable / enable send button.
 */
function setCreateSendBtnAvailability() {
	var name = $("form.register-form :input[name='registerName']").first().val();
	var email = $("form.register-form :input[name='registerEmail']").first().val();
	var sendBtn = $("#createSendBtn");
	if (name.length > 1 && validateEmail(email)) {
		sendBtn.removeAttr("disabled");
	} else {
		sendBtn.attr("disabled", true);
	}
}

function validateGetOolipoPopupEmail() {
	var getOolipoPopupSendBtn = $('#getOolipoPopupSendBtn');
	var getOolipoPopupEmailInput = $('#getOolipoPopupEmailInput');
	var iseEmailValid = validateEmail(getOolipoPopupEmailInput.val());
	iseEmailValid ? getOolipoPopupSendBtn.removeAttr('disabled') : getOolipoPopupSendBtn.attr('disabled', true);
}

/**
 * Handle sending change password form
 * @param userId user id.
 * @param resetToken reset token.
 * @return {boolean} return false - not reload page on submitting form.
 */
function changePassword(userId, resetToken) {
	var newPassword = $("#new-password").val();
	var newPasswordRetyped = $("#new-password-retyped").val();
	if (newPassword != newPasswordRetyped) {
		alert("Passwords doesn't match");
	} else if (newPassword.length < 8) {
		alert("Password must have at least 8 characters");
	} else {
		var requestData = {
			userId: userId,
			resetToken: resetToken,
			newPassword: newPassword
		};

		var onPasswordChanged = function() {
			showModal('<span class="information_modal__text">Your password has been changed</span>', '', false);
			setTimeout(function() {
				closeModal();
			}, 3000);
		};
		var onError = function() {
			showModal('<span class="information_modal__text">Something went wrong :(</span>', '', false);
			setTimeout(function() {
				closeModal();
			}, 3000);
		};
		$.ajax({
			method: 'PUT',
			contentType: 'application/json; charset=UTF-8',
			url: '/api/reset-password',
			data: JSON.stringify(requestData)
		}).then(onPasswordChanged, onError);
	}
	return false;
}

/**
 * Set send forgot password link button availability.
 */
function setForgotPasswordSendBtnAvailability() {
	var email = $("form.register-form :input[name='email']").first().val();
	var sendBtn = $("#sendBtn");
	if (validateEmail(email)) {
		sendBtn.removeAttr("disabled");
	} else {
		sendBtn.attr("disabled", true);
	}
}

/**
 * Send forgot password link.
 * @return {boolean} return false - disable reloading page on form submitting.
 */
function sendForgotPasswordLink() {
	var email = $("form.register-form :input[name='email']").first().val();
	var requestData = {
		email: email
	};

	var onSuccess = function() {
		showModal('<span class="information_modal__text">Reset password link has been send, check your email.</span>', '', false);
		setTimeout(function() {
			closeModal();
			window.location.href = "/";
		}, 5000);
	};
	var onError = function() {
		showModal('<span class="information_modal__text">Something went wrong :(</span>', '', false);
		setTimeout(function() {
			closeModal();
			window.location.href = "/";
		}, 5000);
	};
	$.ajax({
		method: 'PUT',
		contentType: 'application/json; charset=UTF-8',
		url: '/api/reset-password-request',
		data: JSON.stringify(requestData)
	}).then(onSuccess, onError);

	return false;
}

/**
 * Parse support form data and send email to support.
 */
function parseSupportData() {
	var name = $("form.support-form :input[name='supportName']").first().val();
	var email = $("form.support-form :input[name='supportEmail']").first().val();
	var subject = $("form.support-form :input[name='supportSubj']").first().val();
	var message = $("form.support-form :input[name='supportMess']").first().val();
	var sendBtn = $("#sendSupportBtn");
	sendBtn.attr('disabled', true);
	sendSupportEmail(name, email, subject, message);
	return false;
}

/**
 * Send support email.
 * @param name user name.
 * @param email user email.
 * @param subject subject.
 * @param message message.
 */
function sendSupportEmail(name, email, subject, message) {
	var requestData = {
		name: name,
		email: email,
		subject: subject,
		message: message
	};

	var sendBtn = $("#sendSupportBtn");
	var onSuccess = function() {
		showModal('<span class="information_modal__text">Email to the support has been send</span>', '', false);
		setTimeout(function() {
			closeModal();
		}, 5000);
	};
	var onError = function() {
		sendBtn.removeAttr('disabled');
		var view = '<div>' +
			'<div class="information_modal__text">Something went wrong :(</div>' +
			'</div>';
		showModal(view, '', false);
	};
	$.ajax({
		method: 'POST',
		contentType: 'application/json; charset=UTF-8',
		url: '/api/support',
		data: JSON.stringify(requestData)
	}).then(onSuccess, onError);
}
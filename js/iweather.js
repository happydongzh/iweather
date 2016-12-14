/**
 * author: alexDong
 * 仿ios天气预报的juqery plugin
 * 数据来源和ios 一样来自www.wunderground.com 
 **/

;(function ($) {
	var api_key_wunderground = 'b4f96795c1c5848b',
		_wunderground_base_url = 'http://api.wunderground.com/api/' + api_key_wunderground,
		_wunderground_forecase_10day = 'forecast10day',
		_wunderground_forecase_conditions = 'conditions',
		_wunderground_forecase_hourly = 'hourly',
		_wunderground_forecase_astronomy = 'astronomy',
		_wunderground_param = 'lang:CN',
		_wunderground_default_url = _wunderground_base_url + '/' + _wunderground_forecase_10day + '/' + _wunderground_forecase_conditions + '/' + _wunderground_forecase_hourly + '/' + _wunderground_forecase_astronomy + '/' + _wunderground_param,

		_wunderground_locationSearch_url = "http://autocomplete.wunderground.com/aq?query=",

		weathersMainContainer = '<div class="iw-weathersContainer"><div class="topBar"><div class="more-solid icon"></div><div class="more-solid icon" style="margin-left: 23px;"></div><div class="time">20:30PM</div><div class="battery-3 icon"></div></div><div class="weather"></div><div class="bottomBar"><div class="day"><div class="btmbtn"><div class="plus icon"></div></div><div class="btmbtn"><div class="justified icon"></div></div></div></div></div>',

		loading_template = '<div class="iw-loadingContainer"><i class="fa fa-spinner fa-pulse"></i></div>',
		search_template = '<div class="iw-searchContainer"><label>输入城市名</label><div class="search icon"></div><input type="text" /><label>取消</label><ul></ul></div>',

		weather_template = '<div class="weatherContainer slideOutToBottom"><div class="currentWeather"><p>--</p><p></p></div><div class="curTemp">{{tempNow}}</div><div class="curDay"><span>{{day}}</span><span></span><span><span>{{high}}</span><span>{{low}}</span></span></div><div class="hoursWeather"></div><div class="dailyWeather"><div class="days"></div></div></div>',

		wlist_template = '<div class="wlist-item"><p>{{location}}</p><p>{{temp}}</p><p><i class="fa fa-times" aria-hidden="true"></i></p></div>',

		defaultBG = 'url(\'./img/default_bg.png\')',
		_pixabay_API_key = '3670733-6e8c6d6c0b2b0995c0999a4d3',
		_pixabay_API_url = 'https://pixabay.com/api/?key=' + _pixabay_API_key + '&orientation=vertical&category=travel,buildings,places,business&q={{query}}';


	//'http://api.wunderground.com/api/b4f96795c1c5848b/forecast10day/conditions/hourly/astronomy/lang:CN{{cityname}}.json',

	var $wmContainer, $searchContainer, $locSearch, $locSelection, $loadingContainer, $wsContainer, $topBar, $winfoContainer, $bottomBar, $iconAddWeather,
		$iconListView, timer, yTransStep = 0,
		xTransStep = 0,
		$viewStyle = 'NORMAL';

	var eventsHandlers = {
		locationInput: function (e) {
			var _input = $(this);
			//console.log(_input.val());
			if (_input.val().length == 0) {
				$locSelection.children().remove();
				return;
			}
			if (timer) {
				clearTimeout(timer);
			}
			timer = setTimeout(function (e) {
				clearTimeout(timer);
				$loadingContainer.slideToggle();
				$.ajax({
					url: _wunderground_locationSearch_url + _input.val(),
					dataType: "JSONP",
					async: false,
					crossDomain: true,
					jsonp: 'cb',
					jsonpCallback: 'showCities',
					success: function (data) {
						//$loadingContainer.toggleClass('iw-loadingContainerHide');
						$loadingContainer.slideToggle();
						var cities = data['RESULTS'];
						//var cityUL = $locSelection;
						if (cities.length == 0) {
							$locSelection.html('');
							$locSelection.html('<li style="color:black;">Not found</li>');
							return;
						}

						$locSelection.html('');

						$.each(cities, function (index, city) {
							if (city.type == 'city') {
								var _c = $('<li>' + city.name + '</li>');
								_c.on('click', city, eventsHandlers.locationSelect);
								$locSelection.append(_c);
							}
						});
					}
				});
			}, 400)
		},
		docKeypress: function (e) {
			/**
			//up key pressed
			if (e.keyCode == 38) {
				if ($locSelection.children().length != 0) {
					console.log('fwefwef');
				}
			}
			//down key pressed
			if (e.keyCode == 40) {

			}
			**/
			//esc key pressed
			if (e.keyCode == 27 && $winfoContainer.children().length != 0) {
				//console.log(this);
				//debugger
				eventsHandlers.cancelSearch();
			}
		},
		locationSelect: function (e) {
			$locSelection.children().remove();
			$loadingContainer.slideToggle();
			$locSearch.val(e.data.name);
			$.getJSON(_wunderground_default_url + e.data.l + '.json', eventsHandlers.renderWeatherDom);
		},
		mouseleave_scrollup: function (e) {
			e.stopPropagation();
			if (e.type == 'mouseleave' && $(this).hasClass('weatherScrollUp') && $viewStyle == 'NORMAL') {
				yTransStep = 0;
				$(this).removeClass('weatherScrollUp');
				$(this).find('div.days').css({
					transform: 'translateY(0px)'
				});
				$(this).find('div.hours').css({
					transform: 'translateX(0px)'
				});
			}
		},
		mouseWheel_scrollDown: function (e) {
			e.stopPropagation();
			if ($viewStyle == 'LIST') {
				return;
			}
			var value = e.originalEvent.wheelDelta || -e.originalEvent.detail,
				delta = Math.max(-1, Math.min(1, value)),
				hourlyWeather = $(this).children('div.hoursWeather'),
				mouseOnHourly = ((e.pageY >= hourlyWeather.offset().top) && (e.pageY <= (hourlyWeather.offset().top + hourlyWeather.height())) && (e.pageX >= hourlyWeather.offset().left) && (e.pageX <= (hourlyWeather.offset().left + hourlyWeather.parent().width())));

			if (delta < 0) { //scroll down
				if (!$(this).hasClass('weatherScrollUp')) {
					$(this).addClass('weatherScrollUp');
				}
				if (mouseOnHourly) {
					//console.log('1111');
					xTransStep += 40;
					if (xTransStep >= 2560) {
						xTransStep = 2560;
					}
					hourlyWeather.children('.hours').css({
						'transform': 'translateX(-' + xTransStep + 'px)'
					});
					if (xTransStep == 2560) {
						yTransStep += 13;
						if (yTransStep >= 350) {
							yTransStep = 350;
						}
						$(this).find('div.days').css({
							transform: 'translateY(-' + yTransStep + 'px)'
						});
					}

				} else {
					//console.log($(this).position().top);
					if ($(this).position().top <= -24) {
						yTransStep += 13;
						if (yTransStep >= 350) {
							yTransStep = 350;
						}
						$(this).find('div.days').css({
							transform: 'translateY(-' + yTransStep + 'px)'
						});
					}
				}

			} else { //scroll up
				if (mouseOnHourly) {
					xTransStep -= 40;
					if (xTransStep <= 0) {
						xTransStep = 0;
					}
					//console.log(xTransStep);
					hourlyWeather.children('.hours').css({
						'transform': 'translateX(-' + xTransStep + 'px)'
					});
					if (xTransStep == 0) {
						if ($(this).hasClass('weatherScrollUp')) {
							yTransStep -= 13;
							if (yTransStep <= 0) {
								yTransStep = 0;
							}
							$(this).find('div.days').css({
								transform: 'translateY(-' + yTransStep + 'px)'
							});
						}
					}
				} else {
					if ($(this).hasClass('weatherScrollUp') && $(this).position().top <= -25) {
						yTransStep -= 13;
						//console.log(yTransStep);
						if (yTransStep <= 0) {
							yTransStep = 0;
						}
						$(this).find('div.days').css({
							transform: 'translateY(-' + yTransStep + 'px)'
						});
					}
				}

				if ($(this).hasClass('weatherScrollUp') && yTransStep == 0) {
					$(this).removeClass('weatherScrollUp');
				}
			}
		},
		renderWeatherDom: function (wData) {
			var _location = $locSearch.val();
			_location = (_location.indexOf(',') != -1) ? (_location.substring(0, _location.indexOf(','))) : _location;
			var simpleforecast = wData.forecast.simpleforecast.forecastday[0];
			var currentCondition = wData.current_observation;
			var hourlyForecast = wData.hourly_forecast;

			var _id = currentCondition.display_location.latitude + '-' + currentCondition.display_location.longitude;

			var _wt = weather_template.replace(/{{day}}/g, simpleforecast.date.weekday).replace(/{{high}}/g, simpleforecast.high.celsius).replace(/{{low}}/g, simpleforecast.low.celsius)

			var _tw = wlist_template.replace(/{{location}}/g, currentCondition.display_location.city);

			if (hourlyForecast.length != 0) {
				//weatherInfo.children('div.hoursWeather').children('div.curTemp').html(hourlyForecast[0].feelslike.metric + '&ordm;');
				_wt = _wt.replace(/{{tempNow}}/g, hourlyForecast[0].feelslike.metric + '&ordm;');

				_tw = _tw.replace(/{{temp}}/g, hourlyForecast[0].feelslike.metric + '&ordm;');
			} else {
				//weatherInfo.children('div.hoursWeather').children('div.curTemp').html(currentCondition.feelslike_c + '&ordm;');
				_wt = _wt.replace(/{{tempNow}}/g, currentCondition.feelslike_c + '&ordm;');
				_tw = _tw.replace(/{{temp}}/g, currentCondition.feelslike_c + '&ordm;');
			}

			var weatherInfo = $(_wt);
			weatherInfo.attr({
				id: _id
			});

			$winfoContainer.append(weatherInfo);
			weatherInfo.children('div.currentWeather').children().eq(0).html(currentCondition.display_location.city);
			weatherInfo.children('div.currentWeather').children().eq(1).html(simpleforecast.conditions);

			weatherInfo.children('div.hoursWeather').children('.hours').remove();

			var html = '<div class="hours">',
				tempHtml = '<div class="hourly"><p>{{hour}}</p><p><i class="wi wi-wu-{{icon}}"></i></p><p>{{temp}}&ordm;</p></div>';

			$.each(hourlyForecast, function (i, o) {
				if (i == 0) {
					html += tempHtml.replace(/{{hour}}/g, '现在').replace(/{{icon}}/g, o.icon).replace(/{{temp}}/g, o.temp.metric);
				} else {
					html += tempHtml.replace(/{{hour}}/g, (o.FCTTIME.ampm == 'PM' ? '下午' : '上午') + o.FCTTIME.hour).replace(/{{icon}}/g, o.icon).replace(/{{temp}}/g, o.temp.metric);
				}
			});
			html += '</div>';

			weatherInfo.children('div.hoursWeather').html(weatherInfo.children('div.hoursWeather').html() + html);
			html = '';
			tempHtml = '<div class="day"><span>{{day}}</span><span><i class="wi wi-wu-{{icon}}"></i></span><span><span>{{high}}</span><span>{{low}}</span></span></div>';

			var wDays = weatherInfo.children('div.dailyWeather').children('.days');
			$.each(wData.forecast.simpleforecast.forecastday, function (i, o) {
				if (i != 0) {
					html += tempHtml.replace(/{{day}}/g, o.date.weekday).replace(/{{icon}}/g, o.icon).replace(/{{high}}/g, o.high.celsius).replace(/{{low}}/g, o.low.celsius);
				}
			});

			tempHtml = '<div class = "curDayDesciption"><p>今天： {{weatherString}} </p></div>';
			html += tempHtml.replace(/{{weatherString}}/g, wData.forecast.txt_forecast.forecastday[0].fcttext_metric);
			//wDays.html(html);

			tempHtml = '<div class="curDayWeatherItem"><span>日出：</span><span>{{sunrise}}</span></div>';
			html += tempHtml.replace(/{{sunrise}}/g, '上午 ' + wData.sun_phase.sunrise.hour + ':' + wData.sun_phase.sunrise.minute);

			tempHtml = '<div class="curDayWeatherItem"><span>日落：</span><span>{{sunset}}</span></div>';
			html += tempHtml.replace(/{{sunset}}/g, '下午 ' + wData.sun_phase.sunset.hour + ':' + wData.sun_phase.sunset.minute);


			tempHtml = '<div class="curDayWeatherItem"><span>降水概率：</span><span>{{precip_tody_in}}</span></div>';
			html += tempHtml.replace(/{{precip_tody_in}}/g, (currentCondition.precip_today_in * 100) + '%');

			tempHtml = '<div class="curDayWeatherItem"><span>湿度：</span><span>{{humidity}}</span></div>';
			html += tempHtml.replace(/{{humidity}}/g, currentCondition.relative_humidity);

			//====================
			if (hourlyForecast.length != 0) {
				tempHtml = '<div class="curDayWeatherItem "><span>风速：</span><span>{{wind_kph}}</span></div>';
				html += tempHtml.replace(/{{wind_kph}}/g, hourlyForecast[0].wdir.dir + ' ' + Math.ceil(currentCondition.wind_kph * 1000 / 3600) + '米/秒');

				tempHtml = '<div class="curDayWeatherItem"><span>体感温度：</span><span>{{feelslike_c}}</span></div>';
				html += tempHtml.replace(/{{feelslike_c}}/g, hourlyForecast[0].feelslike.metric + '&ordm;');
			}

			tempHtml = '<div class="curDayWeatherItem"><span>降水量：</span><span>{{currentCondition}}</span></div>';
			html += tempHtml.replace(/{{currentCondition}}/g, currentCondition.precip_today_in == '0.00' ? '0毫米' : currentCondition.precip_today_string.replace(/^.*\(|\)/g, '').replace(/\s+mm/g, '毫米'));

			tempHtml = '<div class="curDayWeatherItem"><span>气压：</span><span>{{pressure_mb}}</span></div>';
			html += tempHtml.replace(/{{pressure_mb}}/g, currentCondition.pressure_mb + '百帕');


			tempHtml = '<div class="curDayWeatherItem"><span>能见度：</span><span>{{visibility_km}}</span></div>';
			html += tempHtml.replace(/{{visibility_km}}/g, currentCondition.visibility_km == 'NA' ? '-' : currentCondition.visibility_km + '公里');

			tempHtml = '<div class="curDayWeatherItem"><span>紫外线指数：</span><span>{{solarradiation}}</span></div>';
			html += tempHtml.replace(/{{solarradiation}}/g, currentCondition.solarradiation == '--' ? '-' : currentCondition.solarradiation);

			html += '<div class="curDayWeatherItem"><span>空气质量指数：</span><span>-</span></div><div class="curDayWeatherItem"><span>空气质量：</span><span>-</span></div>';

			eventsHandlers.load_AQI_information(_location, wDays);

			wDays.html(html);
			weatherInfo.hover(eventsHandlers.mouseleave_scrollup);
			weatherInfo.on('mousewheel DOMMouseScroll', eventsHandlers.mouseWheel_scrollDown);

			var iw_location_bg = $('<div class="iw-location-bg slideOutToBottom"></div>');

			iw_location_bg.insertBefore($topBar);

			_tw = $(_tw);
			$wsContainer.append(_tw);

			_tw.on('click', 'p:nth-child(3)', [weatherInfo, iw_location_bg], eventsHandlers.removeLocationWeather);
			_tw.on('click', [weatherInfo, iw_location_bg], eventsHandlers.showLocationWeather);

			eventsHandlers.loadLocationImage(_location, iw_location_bg, _tw);

		},
		addWeather: function (e) {
			$searchContainer.removeClass('slideOutToBottom');
			$winfoContainer.addClass('iw-weatherContainer_masklayer').siblings('div.iw-location-bg.current-bg').addClass('iw-weatherContainer_masklayer');
			$wsContainer.find('div.wlist-item').removeClass('slideInFromBottom');
		},
		showListView: function (e) {
			if ($winfoContainer.children().length == 0) return;
			$viewStyle = 'LIST';
			$winfoContainer.addClass('iw-weatherContainer_masklayer').siblings('div.iw-location-bg.current-bg').addClass('iw-weatherContainer_masklayer').siblings('div.wlist-item').addClass('slideInFromBottom');
			$searchContainer.addClass('slideOutToBottom');
		},
		showLocationWeather: function (e) {
			if (e.data) {
				e.data[0].removeClass('iw-weatherContainer_masklayer slideOutToBottom').siblings('div.weatherContainer').addClass('slideOutToBottom').removeClass('iw-weatherContainer_masklayer');
				e.data[1].removeClass('iw-weatherContainer_masklayer slideOutToBottom').addClass('current-bg').siblings('div.iw-location-bg').removeClass('current-bg iw-weatherContainer_masklayer').addClass('slideOutToBottom');
			}

			$wsContainer.children('div.wlist-item').removeClass('slideInFromBottom');
			$winfoContainer.removeClass('iw-weatherContainer_masklayer');
			$searchContainer.addClass('slideOutToBottom')

			if ($loadingContainer.css('display') != 'none') {
				$loadingContainer.slideToggle();
			}

			$viewStyle = 'NORMAL';
		},
		loadLocationImage: function (location, iwLocationBg, cityListItem) {
			$.ajax({
				url: _pixabay_API_url.replace(/{{query}}/g, encodeURI(location)),
				dataType: 'json',
				timeout: 5000,
				success: function (data) {
					if (data.hits.length != 0) {
						var _imgSrc = data.hits[data.hits.length - 1].webformatURL;
						var bgImg = document.createElement('IMG');
						bgImg.setAttribute('class', 'bg_image');
						bgImg.setAttribute('src', _imgSrc);
						if (!bgImg.complete) {
							$(bgImg).attr("src", bgImg.src).on('load', [iwLocationBg, cityListItem], eventsHandlers.imageLoadEvent);
						} else {
							eventsHandlers.imageLoadEvent.call(bgImg);
						}
					} else {
						iwLocationBg.css({
							backgroundImage: defaultBG
						});
						cityListItem.click();
					}

				},
				error: function (x, s, e) {
					iwLocationBg.css({
						backgroundImage: defaultBG
					});
					cityListItem.click();
				}
			});
		},
		load_AQI_information: function (location, aqiContainer) {
			try {
				_aqiFeed({
					city: encodeURI(location),
					lang: 'cn',
					callback: function (aqiData) {
						var elmts = aqiContainer.find('div.curDayWeatherItem');
						var _len = elmts.length;
						elmts.eq(_len - 2).html(elmts.eq(_len - 2).html().replace(/-/, $(aqiData.aqiv).children().eq(0).html()));
						elmts.eq(_len - 1).html(elmts.eq(_len - 1).html().replace(/-/g, aqiData.impact));
					}
				});
			} catch (err) {
				console.log(err);
			}
		},
		imageLoadEvent: function (e) {
			e.data[0].css({
				backgroundImage: 'url(' + $(this).attr('src') + ')'
			});
			e.data[1].click();
		},
		removeLocationWeather: function (e) {
			e.stopPropagation();
			var _elmts = e.data;
			_elmts[0].addClass('slideOutToBottom'); //remove();
			_elmts[1].addClass('slideOutToBottom'); //.remove();
			var _el = $(this).parent();
			_el.removeClass('slideInFromBottom');
			_elmts[2] = _el;

			function func(elmts) {
				return function () {
					var _h = parseInt(elmts[2].outerHeight());
					elmts[2].nextAll('wlist-item').each(function (i, e) {
						var a = $(e).css('transform').replace(/.*\(\s?|\s?\)/g, '');
						a = parseInt(a);
						$(e).css({
							transform: 'translateY(' + (a + (-h)) + 'px)'
						});
					});
					elmts[2].remove();
					elmts[0].remove();
					elmts[1].remove();
					if ($winfoContainer.siblings('div.wlist-item').length == 0) {
						$winfoContainer.removeClass('iw-weatherContainer_masklayer');
						$iconAddWeather.click();
					}
				}
			}
			var f = func(_elmts);

			setTimeout(f, 100);

			//			setTimeout(function (elmts) {
			//				_elm.nextAll('wlist-item').each(function (i, elmt) {
			//					var a = $(elmt).css('transform').replace(/.*\(\s?|\s?\)/g, '');
			//					a = parseInt(a);
			//					$(elmt).css({
			//						transform: 'translateY(' + (a + (-h)) + 'px)'
			//					});
			//				});
			//				_elm.remove();
			//				elmts[0].remove();
			//				elmts[1].remove();
			//			}, 100);

		},
		geoDetection: function () {
			$locSearch.attr('placeholder', '正在查找位置...');
			$iconAddWeather.click();
			if ($loadingContainer.css('display') == 'none') {
				$loadingContainer.slideToggle();
			}
			if (navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(function (pos) {
					//console.log(pos);
					var _url = _wunderground_default_url + '/' + pos.coords.latitude + ',' + pos.coords.longitude + '.json';
					//var url = 'http://api.wunderground.com/api/b4f96795c1c5848b/geolookup/forecast10day/conditions/hourly/astronomy/lang:CN/q/' + pos.coords.latitude + ',' + pos.coords.longitude + '.json';

					$.getJSON(_url, eventsHandlers.renderWeatherDom);

				}, function (error) {
					switch (error.code) {
					case error.PERMISSION_DENIED:
						alert('用户拒绝对获取地理位置的请求。');
						break;
					case error.POSITION_UNAVAILABLE:
						alert('位置信息是不可用的');
						break;
					case error.TIMEOUT:
						alert('请求用户地理位置超时。');
						break;
					case error.UNKNOWN_ERROR:
						alert('未知错误');
						break;
					}
					$locSearch.attr('placeholder', '');
					$loadingContainer.slideToggle();

				}, {
					timeout: 5000
				});
			} else {
				$locSearch.attr('placeholder', '');
				$loadingContainer.slideToggle();
			}
		},
		cancelSearch: function () {
			if ($winfoContainer.children().length == 0) return;
			$searchContainer.addClass('slideOutToBottom');
			if ($loadingContainer.css('display') != 'none') {
				$loadingContainer.slideToggle();
			}
			$winfoContainer.removeClass('iw-weatherContainer_masklayer').siblings('div.iw-location-bg.current-bg').removeClass('iw-weatherContainer_masklayer');
			$winfoContainer.siblings('div.wlist-item.slideInFromBottom').removeClass('slideInFromBottom');
		}
	}

	var iWeather = function (ele, opt) {
		this.$element = $wmContainer = ele;
		//this.locationInput = ele.children('INPUT');
		this.defaults = {};
		this.options = $.extend({}, this.defaults, opt);
		this._init();
		this.addWeather = function (value) {
			$locSearch.val(value);
			$.getJSON('./mockData/' + value + '.json', eventsHandlers.renderWeatherDom);
		};
		this.removeWeather = function (value) {
			var _x = $wsContainer.children('.wlist-item').eq(value);
			_x.children('P').eq(2).click();
		};
		this.geoLoadWeather = function () {
			eventsHandlers.geoDetection();
		};
		this.searchWeather = function () {
			$iconAddWeather.click();
		};
		this.searchCancel = function () {
			eventsHandlers.cancelSearch();
		}
		this.listWeathers = function () {
			$iconListView.click();
		}

		return this;
	};

	//定义Weather的方法
	iWeather.prototype = {
		_init: function () {
			this._initDom();
			this._initEventsListeners();
		},
		_initDom: function () {
			this.$element.addClass('iw-Container');

			$searchContainer = $(search_template);
			$loadingContainer = $(loading_template);
			$wsContainer = $(weathersMainContainer);

			this.$element.append($searchContainer);
			this.$element.append($loadingContainer);
			this.$element.append($wsContainer);

			$locSearch = $searchContainer.children('input');
			$locSelection = $searchContainer.children('UL');

			$topBar = $wsContainer.children('div.topBar');
			$winfoContainer = $wsContainer.children('div.weather');
			$bottomBar = $wsContainer.children('div.bottomBar');
			$iconAddWeather = $bottomBar.find('div.btmbtn').eq(0);
			$iconListView = $bottomBar.find('div.btmbtn').eq(1);

		},
		_initEventsListeners: function () {
			$(document).on('keydown', eventsHandlers.docKeypress);
			$locSearch.on('keydown', eventsHandlers.locationInput);
			$iconAddWeather.on('click', eventsHandlers.addWeather);
			$iconListView.on('click', eventsHandlers.showListView);
			$searchContainer.children('label').on('click', eventsHandlers.cancelSearch);
		}

	};


	//在插件中使用Weather对象
	$.fn.iweather = function (options) {
		//创建Weather的实体
		var w = new iWeather(this, options);

		return w;
	}
})(jQuery);
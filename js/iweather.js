/**
 * author: liyuan dong
 * 仿ios天气预报的juqery plugin
 * 数据来源和ios 一样来自www.wunderground.com (不过有时候不准啊～～～)
 **/
;
(function ($) {

	function iWeather(ele, opt) {
		this.defaults = {};

		this.options = $.extend({}, this.defaults, opt);

		this.$wmContainer = ele;

		//内部变量
		this.$searchContainer, this.$locSearch, this.$locSelection, this.$loadingContainer, this.$wsContainer, this.$topBar, this.$winfoContainer, this.$bottomBar, this.$iconAddWeather,
			this.$iconListView, this.timer, this.yTransStep = 0,
			this.xTransStep = 0,
			this.$viewStyle = 'NORMAL';

		var self = this;
		//初始化
		var _init = function () {
			_initDom();
			_initEventsListeners();
		};


		//事件处理函数
		var eventsHandlers = {
			//城市输入框事件
			locationInput: function (e) {
				var _input = $(this);
				//console.log(_input.val());
				if (_input.val().length == 0) {
					self.$locSelection.children().remove();
					return;
				}
				if (self.timer) {
					clearTimeout(self.timer);
				}
				self.timer = setTimeout(function (e) {
					clearTimeout(self.timer);
					self.$loadingContainer.show();
					$.ajax({
						url: _wunderground_locationSearch_url + _input.val(),
						dataType: "JSONP",
						async: false,
						crossDomain: true,
						jsonp: 'cb',
						jsonpCallback: 'showCities',
						success: function (data) {
							var cities = data['RESULTS'];
							self.$loadingContainer.hide();
							if (cities.length == 0) {
								self.$locSelection.html('');
								self.$locSelection.html('<li style="color:black;">Not found</li>');
								return;
							}

							self.$locSelection.html('');

							$.each(cities, function (index, city) {
								if (city.type == 'city') {
									var _c = $('<li>' + city.name + '</li>');
									_c.on('click', city, eventsHandlers.locationSelect);
									self.$locSelection.append(_c);
								}
							});
						}
					});
				}, 400)
			},
			//键盘事件--按下ESC键时收起搜索栏(至少已经含有一个天气数据才生效)
			docKeypress: function (e) {
				//esc key pressed
				if (e.keyCode == 27 && self.$winfoContainer.children().length != 0) {
					eventsHandlers.cancelSearch();
				}
			},

			//城市列表，点击城市时触发
			locationSelect: function (e) {
				self.$locSelection.children().remove();
				self.$loadingContainer.show();
				self.$locSearch.val(e.data.name);
				$.getJSON(_wunderground_default_url + e.data.l + '.json', eventsHandlers.renderWeatherDom);
			},
			//鼠标上滑／悬停事件，离开主区域时恢复初始样式
			mouseleave_scrollup: function (e) {
				e.stopPropagation();
				if (e.type == 'mouseleave' && $(this).hasClass('weatherScrollUp') && self.$viewStyle == 'NORMAL') {
					self.yTransStep = 0;
					$(this).removeClass('weatherScrollUp');
					$(this).find('div.days').css({
						transform: 'translateY(0px)'
					});
					$(this).find('div.hours').css({
						transform: 'translateX(0px)'
					});
				}
			},
			//鼠标滚动事件
			mouseWheel_scrollDown: function (e) {
				e.stopPropagation();
				if (self.$viewStyle == 'LIST') {
					return;
				}


				var delta = Math.max(-1, Math.min(1, (e.originalEvent.wheelDelta || -e.originalEvent.detail))),
					hourlyWeather = $(this).children('div.hoursWeather'),

					//是否悬停在小时预报区域
					mouseOnHourly = ((e.pageY >= hourlyWeather.offset().top) && (e.pageY <= (hourlyWeather.offset().top + hourlyWeather.height())) && (e.pageX >= hourlyWeather.offset().left) && (e.pageX <= (hourlyWeather.offset().left + hourlyWeather.parent().width())));

				if (delta < 0) { //向上滚动
					if (!$(this).hasClass('weatherScrollUp')) {
						$(this).addClass('weatherScrollUp');
					}

					//悬停在小时预报区域，先横向滚动小时，小时滚到最后在滚动日期区域
					if (mouseOnHourly) {
						//console.log('1111');
						self.xTransStep += 40;
						if (self.xTransStep >= 2560) {
							self.xTransStep = 2560;
						}
						hourlyWeather.children('.hours').css({
							'transform': 'translateX(-' + self.xTransStep + 'px)'
						});
						if (self.xTransStep == 2560) {
							self.yTransStep += 13;
							if (self.yTransStep >= 400) {
								self.yTransStep = 400;
							}
							$(this).find('div.days').css({
								transform: 'translateY(-' + self.yTransStep + 'px)'
							});
						}

					} else {
						if ($(this).position().top <= -24) {
							self.yTransStep += 13;
							if (self.yTransStep >= 400) {
								self.yTransStep = 400;
							}
							$(this).find('div.days').css({
								transform: 'translateY(-' + self.yTransStep + 'px)'
							});
						}
					}

				} else { //向下滚动
					if (mouseOnHourly) {
						self.xTransStep -= 40;
						if (self.xTransStep <= 0) {
							self.xTransStep = 0;
						}
						//console.log(xTransStep);
						hourlyWeather.children('.hours').css({
							'transform': 'translateX(-' + self.xTransStep + 'px)'
						});
						if (self.xTransStep == 0) {
							if ($(this).hasClass('weatherScrollUp')) {
								self.yTransStep -= 13;
								if (self.yTransStep <= 0) {
									self.yTransStep = 0;
								}
								$(this).find('div.days').css({
									transform: 'translateY(-' + self.yTransStep + 'px)'
								});
							}
						}
					} else {
						if ($(this).hasClass('weatherScrollUp') && $(this).position().top <= -25) {
							self.yTransStep -= 13;
							//console.log(yTransStep);
							if (self.yTransStep <= 0) {
								self.yTransStep = 0;
							}
							$(this).find('div.days').css({
								transform: 'translateY(-' + self.yTransStep + 'px)'
							});
						}
					}

					if ($(this).hasClass('weatherScrollUp') && self.yTransStep == 0) {
						$(this).removeClass('weatherScrollUp');
					}
				}
			},
			//DOM 渲染
			renderWeatherDom: function (wData) {
				var _location = self.$locSearch.val();
				_location = (_location.indexOf(',') != -1) ? (_location.substring(0, _location.indexOf(','))) : _location;
				var simpleforecast = wData.forecast.simpleforecast.forecastday[0];
				var currentCondition = wData.current_observation;
				var hourlyForecast = wData.hourly_forecast;

				var _id = currentCondition.display_location.latitude + '-' + currentCondition.display_location.longitude;

				var _wt = self.template_string.weather_template.replace(/{{day}}/g, simpleforecast.date.weekday).replace(/{{high}}/g, simpleforecast.high.celsius).replace(/{{low}}/g, simpleforecast.low.celsius)

				var _tw = self.template_string.wlist_template.replace(/{{location}}/g, currentCondition.display_location.city);

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

				self.$winfoContainer.append(weatherInfo);
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

				//加载空气质量
				eventsHandlers.load_AQI_information(_location, wDays);

				wDays.html(html);
				weatherInfo.hover(eventsHandlers.mouseleave_scrollup);
				weatherInfo.on('mousewheel DOMMouseScroll', eventsHandlers.mouseWheel_scrollDown);

				var iw_location_bg = $('<div class="iw-location-bg slideOutToBottom"></div>');

				iw_location_bg.insertBefore(self.$topBar);

				_tw = $(_tw);
				self.$wsContainer.append(_tw);

				//添加删除事件
				_tw.children('span:nth-child(3)').on('click', [weatherInfo, iw_location_bg], eventsHandlers.removeLocationWeather);

				//添加点击事件
				_tw.on('click', [weatherInfo, iw_location_bg], eventsHandlers.showLocationWeather);

				//搜索并加载城市图片
				eventsHandlers.loadLocationImage(_location, iw_location_bg, _tw);

			},
			//添加城市天气
			addWeather: function (e) {
				self.$searchContainer.removeClass('slideOutToBottom');
				self.$winfoContainer.addClass('iw-weatherContainer_masklayer').siblings('div.iw-location-bg.current-bg').addClass('iw-weatherContainer_masklayer');
				self.$wsContainer.find('div.wlist-item').removeClass('slideInFromBottom');
			},
			//展示天气列表
			showListView: function (e) {
				if (self.$winfoContainer.children().length == 0) return;
				self.$viewStyle = 'LIST';
				self.$winfoContainer.addClass('iw-weatherContainer_masklayer').siblings('div.iw-location-bg.current-bg').addClass('iw-weatherContainer_masklayer').siblings('div.wlist-item').addClass('slideInFromBottom');
				self.$searchContainer.addClass('slideOutToBottom');
			},
			//展示城市天气详情
			showLocationWeather: function (e) {
				if (e.data) {
					e.data[0].removeClass('iw-weatherContainer_masklayer slideOutToBottom').siblings('div.weatherContainer').addClass('slideOutToBottom').removeClass('iw-weatherContainer_masklayer');
					e.data[1].removeClass('iw-weatherContainer_masklayer slideOutToBottom').addClass('current-bg').siblings('div.iw-location-bg').removeClass('current-bg iw-weatherContainer_masklayer').addClass('slideOutToBottom');
				}

				self.$wsContainer.children('div.wlist-item').removeClass('slideInFromBottom');
				self.$winfoContainer.removeClass('iw-weatherContainer_masklayer');
				self.$searchContainer.addClass('slideOutToBottom')
				self.$loadingContainer.hide();
				self.$viewStyle = 'NORMAL';
			},
			//搜索并加载城市图片
			loadLocationImage: function (location, iwLocationBg, cityListItem) {
				self.$loadingContainer.show();
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
							self.$loadingContainer.hide();
							iwLocationBg.css({
								backgroundImage: self.template_string.defaultBG
							});
							cityListItem.click();
						}

					},
					error: function (x, s, e) {
						self.$loadingContainer.hide();
						iwLocationBg.css({
							backgroundImage: self.template_string.defaultBG
						});
						cityListItem.click();
					}
				});
			},
			//加载空气质量
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
			//图片加载事件
			imageLoadEvent: function (e) {
				e.data[0].css({
					backgroundImage: 'url(' + $(this).attr('src') + ')'
				});
				e.data[1].click();
			},
			//删除天气
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
						if (self.$winfoContainer.siblings('div.wlist-item').length == 0) {
							self.$winfoContainer.removeClass('iw-weatherContainer_masklayer');
							self.$iconAddWeather.click();
						}
					}
				}
				var f = func(_elmts);
				setTimeout(f, 100);
			},
			//自动定位并搜索天气
			geoDetection: function () {},

			//取消城市搜索
			cancelSearch: function () {
				//至少有一个天气数据，否则不能取消
				if (self.$winfoContainer.children().length == 0) return;
				self.$searchContainer.addClass('slideOutToBottom');
				self.$loadingContainer.hide();
				self.$winfoContainer.removeClass('iw-weatherContainer_masklayer').siblings('div.iw-location-bg.current-bg').removeClass('iw-weatherContainer_masklayer');
				self.$winfoContainer.siblings('div.wlist-item.slideInFromBottom').removeClass('slideInFromBottom');
			}
		};
		//初始化DOM
		var _initDom = function () {
			self.$wmContainer.addClass('iw-Container');
			self.$searchContainer = $(self.template_string.search_template);
			self.$loadingContainer = $(self.template_string.loading_template);
			self.$wsContainer = $(self.template_string.weathersMainContainer);

			self.$wmContainer.append(self.$searchContainer);
			self.$wmContainer.append(self.$loadingContainer);
			self.$wmContainer.append(self.$wsContainer);

			self.$locSearch = self.$searchContainer.children('input');
			self.$locSelection = self.$searchContainer.children('UL');
			self.$topBar = self.$wsContainer.children('div.topBar');
			self.$winfoContainer = self.$wsContainer.children('div.weather');
			self.$bottomBar = self.$wsContainer.children('div.bottomBar');
			self.$iconAddWeather = self.$bottomBar.find('div.btmbtn').eq(0);
			self.$iconListView = self.$bottomBar.find('div.btmbtn').eq(1);
		};

		//初始化事件监听
		var _initEventsListeners = function () {
			$(document).on('keydown', eventsHandlers.docKeypress);
			self.$locSearch.on('keydown', eventsHandlers.locationInput);
			self.$iconAddWeather.on('click', eventsHandlers.addWeather);
			self.$iconListView.on('click', eventsHandlers.showListView);
			self.$searchContainer.children('label').on('click', eventsHandlers.cancelSearch);
		};

		_init();

		return this;
	};

	var api_key_wunderground = 'b4f96795c1c5848b',
		_wunderground_base_url = 'https://api.wunderground.com/api/' + api_key_wunderground,
		_wunderground_forecase_10day = 'forecast10day',
		_wunderground_forecase_conditions = 'conditions',
		_wunderground_forecase_hourly = 'hourly',
		_wunderground_forecase_astronomy = 'astronomy',
		_wunderground_param = 'lang:CN',
		_wunderground_locationSearch_url = 'https://autocomplete.wunderground.com/aq?query=',
		_wunderground_default_url = _wunderground_base_url + '/' + _wunderground_forecase_10day + '/' + _wunderground_forecase_conditions + '/' + _wunderground_forecase_hourly + '/' + _wunderground_forecase_astronomy + '/' + _wunderground_param,
		_pixabay_API_key = '3670733-6e8c6d6c0b2b0995c0999a4d3',
		_pixabay_API_url = 'https://pixabay.com/api/?key=' + _pixabay_API_key + '&orientation=vertical&category=travel,buildings,places,business&q={{query}}';

	iWeather.prototype = {
		template_string: {
			weathersMainContainer: '<div class="iw-weathersContainer"><div class="topBar"><div class="more-solid icon"></div><div class="more-solid icon" style="margin-left: 23px;"></div><div class="time">20:30PM</div><div class="battery-3 icon"></div></div><div class="weather"></div><div class="bottomBar"><div class="day"><div class="btmbtn"><div class="plus icon"></div></div><div class="btmbtn"><div class="justified icon"></div></div></div></div></div>',

			loading_template: '<div class="iw-loadingContainer"><div class="spinner"><div class="spinner-container container1"><div class="circle1"></div><div class="circle2"></div><div class="circle3"></div><div class="circle4"></div></div><div class="spinner-container container2"><div class="circle1"></div><div class="circle2"></div><div class="circle3"></div><div class="circle4"></div></div><div class="spinner-container container3"><div class="circle1"></div><div class="circle2"></div><div class="circle3"></div><div class="circle4"></div></div></div></div>',
			search_template: '<div class="iw-searchContainer"><label>输入城市名</label><div class="search icon"></div><input type="text" /><label>取消</label><ul></ul></div>',

			weather_template: '<div class="weatherContainer slideOutToBottom"><div class="currentWeather"><p>--</p><p></p></div><div class="curTemp">{{tempNow}}</div><div class="curDay"><span>{{day}}</span><span></span><span><span>{{high}}</span><span>{{low}}</span></span></div><div class="hoursWeather"></div><div class="dailyWeather"><div class="days"></div></div></div>',

			wlist_template: '<div class="wlist-item"><span>{{location}}</span><span>{{temp}}</span><span><div class="remove icon"></div></span></div>',

			defaultBG: 'url(\'./img/default_bg.png\')',
		},
		addWeather: function (value) {
			this.$locSearch.val(value);
			$.getJSON('./mockData/' + value + '.json', eventsHandlers.renderWeatherDom);
		},
		removeWeather: function (value) {
			var _x = this.$wsContainer.children('.wlist-item').eq(value);
			_x.children('P').eq(2).click();
		},
		geoLoadWeather: function () {
			//eventsHandlers.geoDetection();
			var self = this;
			self.$locSearch.attr('placeholder', '正在查找位置...');
			self.$iconAddWeather.click();
			self.$loadingContainer.show();
			if (navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(function (pos) {
					var _url = api_resources._wunderground_base_url + '/' + api_resources._wunderground_forecase_10day + '/' + api_resources._wunderground_forecase_conditions + '/' + api_resources._wunderground_forecase_hourly + '/' + api_resources._wunderground_forecase_astronomy + '/geolookup/' + api_resources._wunderground_param + '/q/' + pos.coords.latitude + ',' + pos.coords.longitude + '.json';
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
					self.$locSearch.attr('placeholder', '请输入城市名');
					self.$loadingContainer.hide();

				}, {
					timeout: 10000
				});
			} else {
				self.$locSearch.attr('placeholder', '请输入城市名');
				self.$loadingContainer.hide();
			}
		},
		searchWeather: function () {
			this.$iconAddWeather.click();
		},
		searchCancel: function () {
			//eventsHandlers.cancelSearch();
			var self = this;
			if (self.$winfoContainer.children().length == 0) return;
			self.$searchContainer.addClass('slideOutToBottom');
			self.$loadingContainer.hide();
			self.$winfoContainer.removeClass('iw-weatherContainer_masklayer').siblings('div.iw-location-bg.current-bg').removeClass('iw-weatherContainer_masklayer');
			self.$winfoContainer.siblings('div.wlist-item.slideInFromBottom').removeClass('slideInFromBottom');
		},
		listWeathers: function () {
			this.$iconListView.click();
		}
	};

	window.iWeather = iWeather;


})(jQuery);
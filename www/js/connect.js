$.Class('CCONNECT', {
	init: function() {
		this.url = 'https://hoztorgr.ru/app/api.php';
		this.version = '2.1.0';
		this.appOnline = true;
		this.onConnectBefore = new Event('onConnectBefore');
		this.onConnectSuccess = new Event('onConnectSuccess');
		this.onConnectError = new Event('onConnectError');
		this.onConnectProgress = new Event('onConnectProgress');
		this.onConnectConnectionError = new Event('onConnectConnectionError');
		this.beforeSend = function() {};
		this.params = {
			'device': {
				cordova: device.cordova,
				isVirtual: device.isVirtual,
				manufacturer: device.manufacturer,
				model: device.model,
				platform: device.platform,
				serial: device.serial,
				uuid: device.uuid,
				version: device.version,
			},
			'global': {}
		};
		var cl = this;
		navigator.globalization.getPreferredLanguage(
			function (language) {cl.params.global.lang = language.value;},
			function () {cl.params.global.lang = 'unknown';}
		);
		navigator.globalization.getLocaleName(
			function (locale) {cl.params.global.locale = locale.value;},
			function () {cl.params.global.locale = 'unknown';}
		);
	},
	events: {
		onBeforeConnect: function(request, options, headers, callback) {
			callback(request, options, headers);
		},
		onAfterConnect: function(data, callback) {
			callback(data);
		},
	},
	post: function(request, options, headers, success) {
		this.ajax('POST', request, options, headers, success);
	},
	get: function(request, options, headers, success) {
		this.ajax('GET', request, options, headers, success);
	},
	ajax: function(method, request, options, headers, success) {
		if (headers == false) headers = {};
		$.support.cors = true;
		var cl = this;
		if (!options) {
			options = new Object();
		}
		options.request = request;
		options._params = cl.params;
		var date = new Date();
		var time = Math.round(date.getTime()/1000);
		var hash = cl.makeHash(options);
		cl.events.onBeforeConnect(request, options, headers, function (request, options) {
			cl.onConnect(function(connected) {
				db.getData(hash, function(res) {
					options._params.date = res.date;
					db.getSettings(function(settings) {
						options._params.lang = settings.LANG;
						cl.onConnectBefore.data = {
							options: options,
							hash: hash,
							connected: connected
						};
						document.dispatchEvent(cl.onConnectBefore);
						if (connected) {
							try {
								$.ajax({
									headers: headers,
									beforeSend: function() {
										cl.beforeSend();
									},
									xhr: function() {
										var xhr = new window.XMLHttpRequest();
										xhr.addEventListener("progress", function(evt){
											if (evt.lengthComputable) {
												var percentComplete = (evt.loaded / evt.total)*100;
												cl.onConnectProgress.data = {
													loaded: evt.loaded,
													total: evt.total,
													percentComplete: percentComplete.toFixed(),
												};
												document.dispatchEvent(cl.onConnectProgress);
											}
										}, false);
										return xhr;
									},
									type: method,
									url: cl.url,
									data: options,
									statusCode: {
										200: function (response) {
											cl.onConnectSuccess.data = {
												options: options,
												hash: hash,
												connected: connected,
												data: response
											};
											document.dispatchEvent(cl.onConnectSuccess);
											cl.events.onAfterConnect(response, function (response) {
												if (response) {
													success(response);
													if (request != 'preload_resources' && request != '/user/authorize') {
														db.saveData(hash, response);
													}
												} else {
													success(res.data);
												}
											});
										},
										400: function (response) {
											cl.events.onAfterConnect(response.responseJSON, function (response) {
												success(400, response);
											});
										},
										500: function (response) {
											cl.events.onAfterConnect(response.responseJSON, function (response) {
												success(500, response);
											});
										},
										404: function() {
											cl.events.onAfterConnect(response, function (response) {
												cl.onConnectError.data = {
													options: options,
													hash: hash,
													connected: connected,
												};
												document.dispatchEvent(cl.onConnectError);
												navigator.notification.alert(
													'Error 404.',
													function() {
														
													},
													'404',
													'Ok'
												);
											});
										}
									},
									dataType: 'json',
									error: function(response) {
										cl.events.onAfterConnect(response, function (response) {
											cl.onConnectError.data = {
												options: options,
												hash: hash,
												connected: connected,
											};
											document.dispatchEvent(cl.onConnectError);
											navigator.notification.confirm(
												'Error connecting to server :(',
												function(index) {
													if (index == 1) {
														connect.ajax(method, request, options, headers, success);
													} else {
														success(false);
													}
												},
												'Connection',
												['Try again', 'Cancel']
											);
										});
									}
								});
							} catch(e) {
								console.log(e);
							}
						} else {
							cl.events.onAfterConnect(false, function () {
								success(false);
							});
						};
					});
				});
			});
		});
	},
	onConnect: function(callback) {
		var cl = this;
		if (cl.appOnline == true) {
			var networkState = navigator.connection.type;
			if (networkState == Connection.NONE) {
				navigator.notification.confirm(
					'Connection error...',
					onPrompt,
					'internet',
					['Try again','Work offline']
				);
				function onPrompt(result) {
					if (result == 1) {
						cl.onConnect(callback);
					} else {
						cl.appOnline = false;
						callback(false);
					}
				}
			} else {
				callback(true);
			}
		} else {
			cl.onConnectConnectionError.data = {
				connected: false,
			};
			document.dispatchEvent(cl.onConnectConnectionError);
			callback(false);
		}
	},
	makeHash: function(obj) {
		var hashStr = '';
		$.each(obj, function(n,v) {hashStr += n+':'+v+'|'});
		return(hex_md5(hashStr));
	}
});
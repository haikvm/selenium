noDevice = false;
$.Class('CLOADER', {
	init: function(success) {
		this.preloadAssets(success);
	},
	preloadAssets: function(success) {
		var loader = this;
		this.preloader(true);
		db.getSettings(function(data) {
			db.getAssetDates(function(res) {
				if (data.FIRST_RUN == 'Y') {
					assets = false;
				} else {
					assets = {CACHE: res};
				}
				loader.initPreloadedData(assets, success, data.LANG)
			});	
		});
	},
	preloader: function(show) {
		if (show && !$('.app_preloader').is('div')) $('body').append('<div class="app_preloader"><div class="diamond"></div><div class="diamond"></div><div class="diamond"></div></div>');
			else $('.app_preloader').remove();
	},
	initPreloadedData: function(assets, success, lang) {
		var loader = this;
		connect.events.onBeforeConnect = function(request, options, headers, callback) {
			loader.preloader(true);
			callback(request, options, headers);
		};
		connect.events.onAfterConnect = function(data, callback) {
			loader.preloader(false);
			callback(data);
		}
		assets.lang = lang;
		connect.get('preload_resources', assets, false, function(res) {
			if (res != false) {
				$.each(res.js, function(code, value) {
					db.saveAssets(value.DATE, 'js', code, value.CONTENT);
				});
				$.each(res.css, function(code, value) {
					db.saveAssets(value.DATE, 'css', code, value.CONTENT);
				});
				$.each(res.templates, function(code, value) {
					db.saveTemplate(value.DATE, code, value.CONTENT);
				});
				$.each(res.remove, function(key, value) {
					db.removeFiles(value);
				});
				db.saveSettings('FIRST_RUN', 'N');
			}
			db.getTemplates(function(templates) {
				db.getAssets(function(assets) {
					var lang = {};
					$.each(assets, function() {
						if (this.type == 'js') {
							$('body').append('<script type="text/javascript">' + this.data + '</script>');
						} else if (this.type == 'css') {
							$('body').append('<style>' + this.data + '</style>');
						} else if (this.type == 'lang') {
							lang[this.code] = $.parseJSON(this.data);
						}
					});
					console.log(lang);
					console.log(templates);
					loader.preloader(false);
					success(templates, lang);
				});
			});
		});
	},
});
function print_r(arr, level) {
    var print_red_text = "";
    if(!level) level = 0;
    var level_padding = "";
    for(var j=0; j<level+1; j++) level_padding += "&nbsp;&nbsp;&nbsp;";
    if(typeof(arr) == 'object') {
        for(var item in arr) {
            var value = arr[item];
            if(typeof(value) == 'object') {
                print_red_text += level_padding + "'" + item + "' :<br>";
                print_red_text += print_r(value,level+1);
		} 
            else 
                print_red_text += level_padding + "'" + item + "' => \"" + value + "\"<br>";
        }
    } 

    else  print_red_text = "===>"+arr+"<===("+typeof(arr)+")";
    return print_red_text;
}
document.addEventListener("deviceready", onDeviceReady, false);
function onDeviceReady() {
    if (device.platform == 'iOS') {
        //wkWebView.injectCookie('tkyarmarka.com/app/', function() {}, function() {});
    }
	$(function() {
      window.db = new CDB();
      window.connect = new CCONNECT();
      window.loader = new CLOADER(function(templates) {
        window.app = new CAPP(templates);
      });
	});
	window.RECIEVED_PUSH_DATA = '';
	if (!noDevice) {
    /*
		window.plugins.OneSignal
			.startInit("811e7329-e35b-47a4-b1a2-caf032101e6a")
			.inFocusDisplaying(window.plugins.OneSignal.OSInFocusDisplayOption.None)
			.handleNotificationOpened(function(pushdata) {
				initPushData(pushdata, 'opened');
			})
			.handleNotificationReceived(function(pushdata) {
				initPushData(pushdata, 'received');
			})
			.endInit();	
    */ 
	}

}
function initPushData(pushdata, type) {
	window.RECIEVED_PUSH_DATA = pushdata;	
}
$.Class('CDB', {
	init: function() {
		var date = new Date();
		var time = Math.round(date.getTime()/1000);
		if (device.platform == 'Android') {
			this.db = window.openDatabase('hoztorgr', '', 'Application Database', 10485760); 
		} else if (device.platform == 'chrome') {
			this.db = window.openDatabase('hoztorgr', '', 'Application Database', 10485760); 
		} else {
			this.db = window.sqlitePlugin.openDatabase({name: 'hoztorgr.db', iosDatabaseLocation: 'default'});
		}
		this.db.transaction(function(tx) {
			tx.executeSql('CREATE TABLE IF NOT EXISTS settings (date TEXT, code TEXT, data TEXT)');
			tx.executeSql('CREATE TABLE IF NOT EXISTS assets (date TEXT, type TEXT, code TEXT, data TEXT)');
			tx.executeSql('CREATE TABLE IF NOT EXISTS templates (date TEXT, code TEXT, data TEXT)');
			tx.executeSql('CREATE TABLE IF NOT EXISTS data (date TEXT, code TEXT, data TEXT)');
			tx.executeSql('SELECT * FROM settings WHERE code=?', ['FIRST_RUN'], function(txx, res) {
				if (res.rows.length == 0) tx.executeSql("INSERT INTO settings (date, code, data) VALUES (?,?,?)", [time, 'FIRST_RUN', 'Y']);
			});
		}, function(tx, err) {
			console.log(tx); 
			console.log(err); 
		});
		this.version = '0.7.1';
		
	},
	remove: function(table, skey, value, success) {
		this.db.transaction(function(tx) {
			tx.executeSql('DELETE FROM '+table+' WHERE '+skey+'=?', [value], function(txx, res) {
				if(success) success();
			});
		});
	},
	get: function(table, skey, value, success) {
		if (table.length > 0) {
			var strSQL = 'SELECT * FROM '+table;
			if (skey !== false && value !== false) {
				strSQL = 'SELECT * FROM '+table+' WHERE '+skey+'="'+value+'"';
			}
			console.log(strSQL);
			this.db.transaction(function(tx) {
				tx.executeSql(strSQL, [], function(txx, res) {
					if (res.rows.length > 0) {
						var data = {};
						for (n=0; n<res.rows.length; n++) {
							data[n] = res.rows.item(n);
						}
						if (success) success(data);
					} else {
						if (success) success({});
					}
				});
			}, function() {
				if (success) success({});
			});
		} else {
			if (success) success({});
		}
	},
	set: function(table, skey, value, data, success) {
		this.db.transaction(function(tx) {
			tx.executeSql('SELECT * FROM  sqlite_master WHERE name=?', [table], function(txx, res) {
				if (res.rows.length > 0) {				
					tx.executeSql('SELECT * FROM '+table+' WHERE '+skey+'=?', [value], function(txx, res) {
						if (res.rows.length > 0) {
							delete(data[skey]);
							var item = res.rows.item(0);
							var update = false;
							for (var code in data) {
								if (data[code] != item[code]) update = true;
							}
							if (update) {
								var values = Object.values(data); values.push(value);
								var keys = Object.keys(data);
								tx.executeSql("UPDATE "+table+" SET "+keys.join('=?, ')+"=? WHERE "+skey+"=?", values, function() {
									success('update');
								}, function(e, err) {
									success(err.message)
								});
							} else {
								success('same');
							}
						} else {
							var q =[]; for (var key in data) q.push('?');
							tx.executeSql("INSERT INTO "+table+" ("+Object.keys(data).join(', ')+") VALUES ("+q.join(',')+")", Object.values(data), function() {
								success('added');
							}, function(e, err) {
								success('err: '+err.message)
							});
						}
					});
				} else {
					tx.executeSql('CREATE TABLE IF NOT EXISTS '+table+' ('+Object.keys(data).join(' TEXT, ')+' TEXT)', [], function() {
						db.set(table, skey, value, data, success);
					}, function(e, err) {
						success(err.message)
					});
				}
			}, function(e, err) {
				success(err.message)
			});
		});
	},
	clear: function() {
		this.db.transaction(function(tx) {
			tx.executeSql('SELECT * FROM  sqlite_master WHERE type = "table" ', [], function(txx, res) {
				for (n=0; n<res.rows.length; n++) {
					console.log(res.rows.item(n));
					tx.executeSql('DROP TABLE '+res.rows.item(n).name, [], function() {}, function(e, err) {
						console.log(err);
					});
				}
			});
		});
	},
	getSettings: function(success) {
		this.db.transaction(function(tx) {
			tx.executeSql('SELECT * FROM settings', [], function(tx, res) {
				if (res.rows.length > 0) {
					var data = new Object();
					for (n=0; n<res.rows.length; n++) {
						data[res.rows.item(n).code] = res.rows.item(n).data;
					}
					if (success) success(data);
				} else {
					if (success) success({});
				}
			});
		}, function(tx, err) {
			console.error(err);
		});
	},
	saveSettings: function(name, data) {	
		date = new Date();
		time = Math.round(date.getTime()/1000);
		this.db.transaction(function(tx) {
			tx.executeSql('SELECT * FROM settings WHERE code=?', [name], function(txx, res) {
				if (res.rows.length > 0) tx.executeSql("UPDATE settings SET date=?, data=? WHERE code=?", [time, data, name]);
					else tx.executeSql("INSERT INTO settings (date, code, data) VALUES (?,?,?)", [time, name, data]);
			});
		}, function(tx, err) {
			console.error(err);
		});
	},
	getData: function(name, success) {
		this.db.transaction(function(tx) {
			tx.executeSql('SELECT * FROM data WHERE code=?', [name], function(tx, res) {
				if (res.rows.length > 0 && res.rows.item(0).data != '') {	
					var data = {
						data: $.parseJSON(res.rows.item(0).data),
						date: res.rows.item(0).date
					}
					if (success) success(data);
				} else {
					if (success) success(false);
				}
			});
		}, function(tx, err) {
			console.error(err);
		});
	},
	saveData: function(name, data) {
		date = new Date();
		time = Math.round(date.getTime()/1000);
		this.db.transaction(function(tx) {
			tx.executeSql('SELECT * FROM data WHERE code=?', [name], function(txx, res) {
				if (res.rows.length > 0) tx.executeSql("UPDATE data SET date=?, data=? WHERE code=?", [time, JSON.stringify(data), name]);
					else tx.executeSql("INSERT INTO data (date, code, data) VALUES (?,?,?)", [time, name, JSON.stringify(data)]);
			});
		}, function(tx, err) {
			console.error(err);
		});
	},
	saveAssets: function(date, type, code, data, success) {
		this.db.transaction(function(tx) {
			tx.executeSql('SELECT * FROM assets WHERE code=?', [code], function(txx, res) {
				if (res.rows.length > 0) {
					tx.executeSql("UPDATE assets SET date=?, data=? WHERE code=?", [date, data, code], function() {
						if (success) success();
					});
				} else {
					tx.executeSql("INSERT INTO assets (date, type, code, data) VALUES (?,?,?,?)", [date, type, code, data], function() {
						if (success) success();
					});
				}
			});
		}, function(tx, err) {
			console.error(tx);
		});
	},
	getAssetDates: function(success) {
		cdb = this;
		cdb.db.transaction(function(tx) {
			tx.executeSql('SELECT * FROM assets', [], function(txx, res) {
				dates = new Object();
				for (n=0; n<res.rows.length; n++) {
					dates[res.rows.item(n).code] = res.rows.item(n).date;
				}
				cdb.db.transaction(function(tx) {
					tx.executeSql('SELECT * FROM templates', [], function(txx, res) {
						for (n=0; n<res.rows.length; n++) {
							dates[res.rows.item(n).code] = res.rows.item(n).date;
						}
						if (success) success(dates);
					});
				});
			});
		});
	},
	getAssets: function(success) {
		this.db.transaction(function(tx) {
			tx.executeSql('SELECT * FROM assets', [], function(txx, res) {
				var obj = new Array(); for (n=0; n<res.rows.length; n++) {
					obj.push(res.rows.item(n))
				}
				if (success) success(obj);
			});
		});
	},
	saveTemplate: function(date, code, data) {
		this.db.transaction(function(tx) {
			tx.executeSql('SELECT * FROM templates WHERE code=?', [code], function(txx, res) {
				if (res.rows.length > 0) {
					tx.executeSql("UPDATE templates SET date=?, data=? WHERE code=?", [date, data, code]);
				} else {
					tx.executeSql("INSERT INTO templates (date, code, data) VALUES (?,?,?)", [date, code, data]);
				}
			});
		}, function(tx, err) {
			console.error(tx);
		});
	},
	getTemplates: function(success) {
		var templates = {};
		this.db.transaction(function(tx) {
			tx.executeSql('SELECT * FROM templates', [], function(txx, res) {
				for (n=0; n<res.rows.length; n++) {
					code = res.rows.item(n).code;
					templates[code.replace('.html', '')] = res.rows.item(n).data;
				}
				if (success) success(templates);
			});
		}, function(tx, err) {
			console.error(tx);
		});
	},
	removeFiles: function(code) {
		this.db.transaction(function(tx) {
			tx.executeSql('DELETE FROM templates WHERE code=?', [code], function(txx, res) {});
			tx.executeSql('DELETE FROM assets WHERE code=?', [code], function(txx, res) {});
		});
	}
});
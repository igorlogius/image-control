(async function() {
	const extId = 'dontLoadImages';

	const filter = {
		urls: ["<all_urls>"], 
		types: ["image", "imageset"]
	};
	const extraInfoSpec = ["blocking"];

	let store = await browser.storage.local.get(extId);
	store = (typeof store[extId] !== 'undefined') ? store[extId] : {} ;
	//console.log('store ', JSON.stringify(store,null,4));
	let mode = (typeof store['mode'] === 'boolean') ? store['mode'] : false; // false := whitelist

	browser.browserAction.setTitle({title: (mode?"black":"white") + "list" });
	browser.browserAction.setIcon({path: (mode?"black":"white") + ".png" });

	async function setStorage(store) {
		await browser.storage.local.set({'dontLoadImages': store});
	}

	async function BAonClicked() {
		mode=(!mode);
		browser.browserAction.setIcon({path: (mode?"black":"white") + ".png" });
		browser.browserAction.setTitle({title: (mode?"black":"white") + "list" });

		store['mode'] = mode;
		await setStorage(store);

		/* https://github.com/igorlogius/dontLoadImages/issues/1 
		const tabs = await browser.tabs.query({});
		for(let tab of tabs) {
			await browser.tabs.reload(tab.id);
		}
		*/


	};

	async function onBeforeRequest (details) {

		// the url of the tab which triggered the request 
		// determines if all subsequent images will be loaded
		//const tab = await browser.tabs.get(details.tabId);
		const domain = new URL(details.documentUrl); 
		const origin = domain.origin;


		if(mode) { // blacklist 
			if(typeof store[origin] === 'boolean'){
				//console.log('blacklist block request to ', details.url , " from " ,  origin);
				return {cancel: true};
			}
		}else{ // whitelist
			if(typeof store[origin] !== 'boolean'){
				//console.log('whitelist block request to ', details.url , " from " ,  origin);
				return {cancel: true};
			}
		}
		//console.log('loaded', details.url);
	}


	async function PAonClicked(tab) {
		const domain = new URL(tab.url);

		console.log('PAonClicked domain: ' + domain.origin);


		let notify_title = '';
		if (typeof store[domain.origin] === 'boolean') {
			delete store[domain.origin];

			if(mode) { // blacklist 
				notify_title = extId + '\nremoved "' + domain.origin + '" from blacklist';
			}else{
				notify_title = extId + '\nremoved "' + domain.origin + '" from whitelist';
			}
		}else{
			store[domain.origin] = true;

			if(mode) { // blacklist 

				notify_title = extId + '\nadded "' + domain.origin + '" to blacklist';
			}else{
				notify_title = extId + '\nadded "' + domain.origin + '" to whitelist';
			}
		}
		//console.log(store);
		setStorage(store);

		/* https://github.com/igorlogius/dontLoadImages/issues/1 
		const tabs = await browser.tabs.query({url: domain.origin + "/*"});
		for(let tab of tabs) {
			//browser.tabs.reload(tab.id);
			browser.tabs.executeScript({
				code: `
				    var images = document.getElementsByTagName("img");
				    let images_length = images.length;
				    for (let i = 0; i < images_length; i++) {
				      images[i].style.setProperty("display", "none", "important");
				    }
				    let all_elements = document.querySelectorAll("*");
				    for(let i = 0 ; i < all_elements.length ; i++){
				      all_elements[i].style.setProperty("background-image","unset","important");
				    }	
				`
			});
		}
		*/


		const notify_message = 'open tabs with this origin will not be affected';

		browser.notifications.create(extId, {
			"type": "basic",
			"iconUrl": browser.runtime.getURL("icon.png"),
			"title": notify_title, 
			"message":  notify_message 
		});
	};

	/*
	function onUpdated(tabId, changeInfo, tab) {

		if (changeInfo.status !== 'complete' || typeof tab.url !== 'string'){
			return;
		}
		const domain = new URL(tab.url);
		if (typeof store[domain.origin] !== 'boolean') {
			browser.pageAction.setIcon({tabId: tabId, path: "plus.png" });
			browser.pageAction.setTitle({tabId: tabId, title: "add to list" });
		}else {
			browser.pageAction.setIcon({tabId: tabId, path: "minus.png" });
			browser.pageAction.setTitle({tabId: tabId, title: "remove from list" });
		}
	};
	*/


	//browser.tabs.onUpdated.addListener(onUpdated, { urls: ["<all_urls>"], properties: ["status"] });
	browser.webRequest.onBeforeRequest.addListener(onBeforeRequest,filter,extraInfoSpec);
	browser.browserAction.onClicked.addListener(BAonClicked);
	browser.pageAction.onClicked.addListener(PAonClicked);

}());

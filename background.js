(async function() {
	const extId = 'DontLoadImages';

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

		const tabs = await browser.tabs.query({});
		for(let tab of tabs) {
			await browser.tabs.reload(tab.id);
		}
	};

	function onBeforeRequest (details) {

		const domain = new URL(details.originUrl);
		const origin = domain.origin;

		if(mode) { // blacklist 
			if(typeof store[origin] === 'boolean'){
				//console.log('blocked', details.url);
				return {cancel: true};
			}
		}else{ // whitelist
			if(typeof store[origin] !== 'boolean'){
				//console.log('blocked', details.url);
				return {cancel: true};
			}
		}
		//console.log('loaded', details.url);
	}


	async function PAonClicked(tab) {
		const domain = new URL(tab.url);

		if (typeof store[domain.origin] === 'boolean') {
			delete store[domain.origin];
		}else{
			store[domain.origin] = true;
		}
		//console.log(store);
		setStorage(store);
		const tabs = await browser.tabs.query({url: domain.origin + "/*"});
		for(let tab of tabs) {
			browser.tabs.reload(tab.id);
		}
	};

	function onCompleted(details) {
		if (details.frameId !== 0) {
			return;
		}
		const domain = new URL(details.url);
		if (typeof store[domain.origin] !== 'boolean') {
			browser.pageAction.setIcon({tabId: details.tabId, path: "plus.png" });
			browser.pageAction.setTitle({tabId: details.tabId, title: "add to list" });
		}else {
			browser.pageAction.setIcon({tabId: details.tabId, path: "minus.png" });
			browser.pageAction.setTitle({tabId: details.tabId, title: "remove from list" });
		}
	};


	browser.webNavigation.onCompleted.addListener(onCompleted);
	browser.webRequest.onBeforeRequest.addListener(onBeforeRequest,filter,extraInfoSpec);
	browser.browserAction.onClicked.addListener(BAonClicked);
	browser.pageAction.onClicked.addListener(PAonClicked);

}());

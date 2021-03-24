(async function() {
	const extId = 'DontLoadImages';

	const filter = {
		urls: ["<all_urls>"], 
		types: ["image", "imageset"]
	};
	const extraInfoSpec = ["blocking"];

	let tabIds_to_block_imgs_from = {} ;
	let store = await browser.storage.local.get(extId);
	store = (typeof store[extId] !== 'undefined') ? store[extId] : {} ;
	//console.log('store ', JSON.stringify(store,null,4));
	let mode = (typeof store['mode'] === 'boolean') ? store['mode'] : false; // false := whitelist
	
	browser.browserAction.setTitle({title: (mode?"black":"white") + "list" });
	browser.browserAction.setIcon({path: (mode?"black":"white") + ".png" });

	async function setStorage(store) {
		await browser.storage.local.set({'dontLoadImages': store});
	}

	const BAonClicked = async () => {
		mode=(!mode);
		browser.browserAction.setIcon({path: (mode?"black":"white") + ".png" });
		browser.browserAction.setTitle({title: (mode?"black":"white") + "list" });

		store['mode'] = mode;
		await setStorage(store);

		const tabs = await browser.tabs.query({});
		for(let tab of tabs) {
			browser.tabs.reload(tab.id);
		}
	};

	const onBeforeRequest = (details) => {
		if(mode) { // blacklist  
			if (typeof tabIds_to_block_imgs_from[details.tabId] === 'boolean' && tabIds_to_block_imgs_from[details.tabId] === true) {
				return {'cancel': true};
			}
		}else {  // whitelist 
			if (typeof tabIds_to_block_imgs_from[details.tabId] !== 'boolean' ) {
				return {'cancel': true};
			}
		}
		return {'cancel': false};
	};


	async function PAonClicked(tab) {
		const domain = new URL(tab.url);

		if (typeof store[domain.origin] === 'undefined') {
			store[domain.origin] = true;
		}else{
			store[domain.origin] = undefined;
			delete store[domain.origin];
		}
		await setStorage(store);
		const tabs = await browser.tabs.query({url: domain.origin + "/*"});
		for(let tab of tabs) {
			await browser.tabs.reload(tab.id);
		}
	};

	async function onCompleted(details) {
		if (details.frameId !== 0) {
			return;
		}
		const domain = new URL(details.url);
		if (typeof store[domain.origin] === 'undefined') {
			browser.pageAction.setIcon({tabId: details.tabId, path: "plus.png" });
			browser.pageAction.setTitle({tabId: details.tabId, title: "add to list" });
		}else {
			browser.pageAction.setIcon({tabId: details.tabId, path: "minus.png" });
			browser.pageAction.setTitle({tabId: details.tabId, title: "remove from list" });
		}
	};

	async function onBeforeNavigate(details) {
		if (details.frameId !== 0) {
			return;
		}
		const domain = new URL(details.url);
		if (typeof store[domain.origin] === 'undefined') {
			tabIds_to_block_imgs_from[details.tabId] = undefined;
			delete tabIds_to_block_imgs_from[details.tabId]; 
		}else {
			tabIds_to_block_imgs_from[details.tabId] = true; 
		}
	};

	browser.webNavigation.onCompleted.addListener(onCompleted);
	browser.webNavigation.onBeforeNavigate.addListener(onBeforeNavigate);
	browser.webRequest.onBeforeRequest.addListener(onBeforeRequest,filter,extraInfoSpec);
	browser.browserAction.onClicked.addListener(BAonClicked);
	browser.pageAction.onClicked.addListener(PAonClicked);

}());

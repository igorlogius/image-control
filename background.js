(async function() {
const extId = 'dontLoadImages';

let tabIds_to_block_imgs_from = {} ;

async function getStorage() {
	let store = await browser.storage.local.get(extId);
	store = (typeof store[extId] !== 'undefined') ? store[extId] : {} ;
	return store;
}

let gstore = getStorage();
let cancel = (typeof gstore['global'] !== 'undefined');

async function setStorage(store) {
	//console.log(store);
	await browser.storage.local.set({'dontLoadImages': store});
}

const onBAClicked = async () => {
	//console.log("onBAClicked");
	browser.browserAction.setIcon({path: (cancel?"":"dont") + "load.png" });
	cancel=(!cancel);

	gstore = await getStorage();
	if (cancel){
		gstore['global'] = true;
	}else{
		gstore['global'] = undefined;
		delete gstore['global'];
	}
	await setStorage(gstore);

	// todo: tab reload
	const tabs = await browser.tabs.query({});
	for(let tab of tabs) {
		browser.tabs.reload(tab.id);
	}
};

const onWRBeforeRequest = (details) => {
	if (tabIds_to_block_imgs_from[details.tabId] || cancel) {
		//console.log('canceled request for ',details.tabId, details.url);
		return {'cancel': true};
	}
};

const filter = {
		urls: ["<all_urls>"], 
		types: ["image", "imageset"]
};
const extraInfoSpec = ["blocking"];

async function onPAClicked(tab) {
	//console.log("onPAClicked");
	// check if page is in storage
	const domain = new URL(tab.url);

	let store = await getStorage(); 
	//console.log(store);

	if (typeof store[domain.origin] === 'undefined') {
		store[domain.origin] = true;
		//browser.pageAction.setIcon({tabId: tab.id, path: "dontload.png" });
		//console.log('set to dont load, for ', domain.origin);
	}else{
		store[domain.origin] = undefined;
		delete store[domain.origin];
		//browser.pageAction.setIcon({tabId: tab.id, path: "load.png" });
		//console.log('set to load, for ', domain.origin);
	}
	//console.log(store);
	await setStorage(store);
	const tabs = await browser.tabs.query({url: domain.origin + "/*"});
	for(let tab of tabs) {
		browser.tabs.reload(tab.id);
	}
};

async function onWNCompleted(details) {
	if (details['frameId'] !== 0) {
		return;
	}
	//console.log('onWNCompleted');

	const domain = new URL(details.url);

	let store = await getStorage();
	//console.log('onWNCompleted:: ', JSON.stringify(store,null,4));
	if (typeof store[domain.origin] === 'undefined') {
		//console.log('onWNCompleted:: ', store[domain.origin]);
		tabIds_to_block_imgs_from[details.tabId] = undefined;
		delete tabIds_to_block_imgs_from[details.tabId]; 
		browser.pageAction.setIcon({tabId: details.tabId, path: "load.png" });
		//console.log('onWNCompleted ::: set to load, for ', domain.origin);
	}else {
		tabIds_to_block_imgs_from[details.tabId] = true; 
		browser.pageAction.setIcon({tabId: details.tabId, path: "dontload.png" });
		//console.log('onWNCompleted :: set to dont load, for ', domain.origin);

	}
	//console.log('tabids to block', tabIds_to_block_imgs_from);

};

browser.webNavigation.onCompleted.addListener(onWNCompleted);
browser.webNavigation.onBeforeNavigate.addListener(onWNCompleted);
browser.webRequest.onBeforeRequest.addListener(onWRBeforeRequest,filter,extraInfoSpec);
browser.browserAction.onClicked.addListener(onBAClicked);
browser.pageAction.onClicked.addListener(onPAClicked);
}());

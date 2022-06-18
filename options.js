/*global browser */

const impbtnWrp = document.getElementById('impbtn_wrapper');
const impbtn = document.getElementById('impbtn');
const expbtn = document.getElementById('expbtn');

expbtn.addEventListener('click', async function () {
    var dl = document.createElement('a');
    var res = await browser.storage.local.get('dontLoadImages');
    var content = JSON.stringify(res.dontLoadImages);
    dl.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(content));
    dl.setAttribute('download', 'data.json');
    dl.setAttribute('visibility', 'hidden');
    dl.setAttribute('display', 'none');
    document.body.appendChild(dl);
    dl.click();
    document.body.removeChild(dl);
});

// delegate to real Import Button which is a file selector
impbtnWrp.addEventListener('click', function() {
    impbtn.click();
})

impbtn.addEventListener('input', function () {
    var file  = this.files[0];
    var reader = new FileReader();
    reader.onload = async function() {
        try {
            var config = JSON.parse(reader.result);
            console.log(JSON.stringify(config,null,4));
            await browser.storage.local.set({ 'dontLoadImages': config});

        browser.notifications.create('dontLoadImages', {
            "type": "basic",
            "iconUrl": browser.runtime.getURL("icon.png"),
            "title": 'Image Control - Import done',
            "message":  JSON.stringify(config, null,4)
        });
        } catch (e) {
            console.error('error loading file: ' + e);
        }
    };
    reader.readAsText(file);
});


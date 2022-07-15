/*global browser */

const impbtnWrp = document.getElementById('impbtn_wrapper');
const impbtn = document.getElementById('impbtn');
const expbtn = document.getElementById('expbtn');

expbtn.addEventListener('click', async () => {
    let dl = document.createElement('a');
    let res = await browser.storage.local.get('list');
    let content = '[]';
    if(typeof res !== 'undefined'){
        if(typeof res.list !== 'undefined'){
            content = JSON.stringify(res.list, null, 4);
        }
    }
    dl.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(content));
    dl.setAttribute('download', 'image-control-origins.json');
    dl.setAttribute('visibility', 'hidden');
    dl.setAttribute('display', 'none');
    document.body.appendChild(dl);
    dl.click();
    document.body.removeChild(dl);
});

// delegate to real Import Button which is a file selector
impbtnWrp.addEventListener('click', impbtn.click)

impbtn.addEventListener('input', () => {
    let file  = this.files[0];
    let reader = new FileReader();
    reader.onload = async () => {
            const data = JSON.parse(reader.result);
            await browser.storage.local.set({ 'list': data});
            browser.notifications.create('image-control', {
                "type": "basic",
                "iconUrl": browser.runtime.getURL("icon.png"),
                "title": 'Image Control',
                "message": 'Imported ' + data.length + ' origins'
            });
    };
    reader.readAsText(file);
});


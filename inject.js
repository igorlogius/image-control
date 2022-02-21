let timerID;

function onChange() {
    var allElements = document.getElementsByTagName('*');
    for (var i = 0, length = allElements.length; i < length; i++) {
        let el = allElements[i];
        el.style.background = 'none';
        const tagName = el.tagName.toLowerCase();
        if(el.tagName  === 'img'){
            el.style.display = 'none';
        }
        else if(el.tagName  === 'picture'){
            el.style.display = 'none';
        }
        else if(el.tagName  === 'canvas'){
            el.style.display = 'none';
        }

    }
}

function delayed_onChange(){
    clearTimeout(timerID);
    timerID = setTimeout(onChange, 500); // todo: maybe there is a better way to determine if the site is settled
}

(new MutationObserver(delayed_onChange)).observe(document.body, { attributes: true, childList: true, subtree: true });

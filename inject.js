(function(){
    if (typeof window.ilc_hasRun !== 'undefined'){
        return;
    }
    window.icl_hasRun = true;

    let ICLTimerID;

    function onChange() {
        var allElements = document.getElementsByTagName('*');
        for (var i = 0, length = allElements.length; i < length; i++) {

            let el = allElements[i];

            if(el){

                if(el.style.backgroundImage.length !== 0){
                    el.style.removeProperty('backgroundImage');
                }

                const tagName = el.tagName.toLowerCase();
                switch(tagName){
                    case 'img':
                    case 'picture':
                    case 'canvas': // might contain image data
                    case 'svg': // strictly speaking not an image ... but a document ... but can be used to draw stuff, like a canvas
                    case 'video': // a lot of images, technically
                        el.remove();
                        break;
                    default:
                        break;
                }
            }
        }
    }

    function delayed_onChange(){
        clearTimeout(ICLTimerID);
        ICLTimerID = setTimeout(onChange, 500); // todo: maybe there is a better way to determine if the site is settled
    }

    (new MutationObserver(delayed_onChange)).observe(document.body, { attributes: true, childList: true, subtree: true });

}());

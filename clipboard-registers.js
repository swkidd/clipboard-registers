
const userInputContainer = document.createElement('form')
userInputContainer.style['all'] = "unset"
userInputContainer.style['position'] = "fixed"
userInputContainer.style['top'] = "0"
userInputContainer.style['right'] = "0"
userInputContainer.style['width'] = "150px"
userInputContainer.style['height'] = "50px"
userInputContainer.style['background-color'] = "#fff"
userInputContainer.style.setProperty("visibility", "hidden", "important")
userInputContainer.style['z-index'] = "2147483647"
userInputContainer.style['box-shadow'] = "0 0 10px rgba(0,0,0,0.5)"
userInputContainer.style['box-sizing'] = "border-box"
userInputContainer.style['margin'] = "5px"
userInputContainer.style['text-align'] = "center"
userInputContainer.style['border-radius'] = "5px"
userInputContainer.style['border'] = "1px solid #bfc0c1"
userInputContainer.autocomplete = "off"
userInputContainer.id = "clipboard-registers-user-input-form"

const userInput = document.createElement('input')
userInput.style['all'] = "unset"
userInput.style['display'] = "inline-block"
userInput.style['width'] = "100%"
userInput.style['height'] = "100%"
userInput.style['font-size'] = "24px"
userInput.style['font-weight'] = "bold"
userInput.style['text-align'] = "center"
userInput.style['border'] = "none"
userInput.style['border-color'] = "transparent"
userInput.style['border-radius'] = "5px"
userInput.style['margin'] = "0"
userInput.style['caret-color'] = "#bfc0c1"
userInput.type = "text"
userInput.maxLength = "4"
userInput.autocomplete = "off"
userInput.id = "clipboard-registers-user-input"

userInputContainer.appendChild(userInput)
document.body.appendChild(userInputContainer)

const noop = e => { }
let onSubmit = noop
userInputContainer.addEventListener('submit', (e) => {
    onSubmit(e)
    onSubmit = noop
})

//reset on visiblity change
document.addEventListener('visibilitychange', () => {
    userInput.value = ""
    userInputContainer.style.setProperty("visibility", "hidden", "important")
    onSubmit = noop
})

function saveSelection() {
    if (window.getSelection) {
        var sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) {
            return sel.getRangeAt(0);
        }
    } else if (document.selection && document.selection.createRange) {
        return document.selection.createRange();
    }
    return null;
}

function restoreSelection(range) {
    if (range) {
        if (window.getSelection) {
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        } else if (document.selection && range.select) {
            range.select();
        }
    }
}

const isInput = e => ['INPUT', 'TEXTAREA'].includes(e.tagName)

const isVisible = elem => !!elem && !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length)

//hide input on off click
const handleClickOutside = (element, currentFocus, range) => {
    const outsideClickListener = event => {
        if (!element.contains(event.target) && isVisible(element)) {
            userInputContainer.style.setProperty("visibility", "hidden", "important")
            if (!isInput(currentFocus)) {
                restoreSelection(range)
            }
            removeClickListener()
        }
    }

    const removeClickListener = () => {
        document.removeEventListener('click', outsideClickListener)
    }

    document.addEventListener('click', outsideClickListener)
    onSubmit = noop
}
/*
    there are two types of editable content in html those with the contentEditable attribute 
    set to true and input/ textareas 

    each needs to be handled differently for setting and resetting the focus of an element  

    copy needs to do nothing when there isnt any text selected

    getSelection does not work for textareas/ input elements in firefox or internet explorer  
    must find another way to get selected content

    setting focus only works for textarea/input elements

    none of this works for iframes
*/
//override document copy event handler (copy event bubbles from element to document)
document.querySelector("body").addEventListener("copy", (event) => {

    // only works for input or textarea elements
    const currentFocus = document.activeElement

    let selection
    let range = saveSelection()
                console.log(range)
    if (isInput(currentFocus)) {
        selection = currentFocus.value.slice(currentFocus.selectionStart, currentFocus.selectionEnd)
    } else if (currentFocus.tagName === 'IFRAME') {
        // do not support iframes (default copy)
        return
    } else {
        selection = document.getSelection().toString()

        // save selction for refocusing after copying
        saveSelection(selection)
    }

    if (!selection || selection === "") return

    // allow normal use of clipboard ctrl-c / ctrl-p outside browser window
    event.clipboardData.setData('text/plain', selection)

    userInputContainer.style.setProperty("visibility", "visible", "important")
    userInput.focus()

    handleClickOutside(userInputContainer, currentFocus, range)

    onSubmit = (e) => {
        const data = {}
        const inputValue = userInput.value
        data[inputValue] = selection
        browser.storage.local.set(data)

        userInput.value = ""
        userInputContainer.style.setProperty("visibility", "hidden", "important")
        currentFocus.focus()
        if (!isInput(currentFocus)) {
            console.log(range)
            restoreSelection(range)
        }
        e.preventDefault()
    }
    event.preventDefault()
})

//override document paste event handler (paste event bubbles from element to document)
// pasted text should be selected after pasting
document.querySelector("body").addEventListener("paste", (event) => {
    const currentFocus = document.activeElement

    // do not support iframes (default paste)
    if (currentFocus.tagName === "IFRAME") return

    const paste = (event.clipboardData || window.clipboardData).getData('text');
    let range = saveSelection()
   
    userInputContainer.style.setProperty("visibility", "visible", "important")
    userInput.focus()

    handleClickOutside(userInputContainer)

    onSubmit = (e) => {
        e.preventDefault()
        const inputValue = userInput.value
        userInput.value = ""
        userInputContainer.style.setProperty("visibility", "hidden", "important")
        if (inputValue === "") {
            if (isInput(currentFocus)) {
                const currentValue = currentFocus.value
                const start = currentFocus.selectionStart
                currentFocus.value = currentValue.slice(0, start) + paste + currentValue.slice(start)
            } else {
                restoreSelection(range)
                const selection = window.getSelection();
                if (!selection.rangeCount) return false;
                selection.deleteFromDocument();
                selection.getRangeAt(0).insertNode(document.createTextNode(paste));
            }
        } else {
            browser.storage.local.get(inputValue).then(data => {
                const paste = data[inputValue]
                if (paste) {
                    currentFocus.focus()
                    if (isInput(currentFocus)) {
                        const currentValue = currentFocus.value
                        const start = currentFocus.selectionStart
                        currentFocus.value = currentValue.slice(0, start) + paste + currentValue.slice(start)
                    } else if (currentFocus.isContentEdidiable) {
                        restoreSelection(range)
                        const selection = window.getSelection();
                        if (!selection.rangeCount) return false;
                        selection.deleteFromDocument();
                        selection.getRangeAt(0).insertNode(document.createTextNode(paste));
                    }
                }
            })
        }
    }
    event.preventDefault()
})

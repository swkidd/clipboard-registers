
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

const isVisible = elem => !!elem && !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length)

//hide input on off click
const handleClickOutside = (element) => {
    const outsideClickListener = event => {
        if (!element.contains(event.target) && isVisible(element)) {
            userInputContainer.style.setProperty("visibility", "hidden", "important")
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

*/
//override document copy event handler (copy event bubbles from element to document)
document.querySelector("body").addEventListener("copy", (event) => {

    // may not work in input or textarea elements
    const selection = document.getSelection().toString()

    // allow normal use of clipboard ctrl-c / ctrl-p outside browser window
    event.clipboardData.setData('text/plain', selection)

    userInputContainer.style.setProperty("visibility", "visible", "important")

    // only works for input or textarea elements
    const currentFocus = document.activeElement

    userInput.focus()

    handleClickOutside(userInputContainer)

    onSubmit = (e) => {
        const data = {}
        const inputValue = userInput.value
        data[inputValue] = selection
        browser.storage.local.set(data)

        userInput.value = ""
        userInputContainer.style.setProperty("visibility", "hidden", "important")
        currentFocus.focus()
        e.preventDefault()
    }
    event.preventDefault()
})

// inorder to use the default paste implementation (and avoid differentiating between 
// content editable and input/texarea elments) I am calling document.execCommand("paste")
// after setting the clipboard content to the retrieved data, but this command calls the
// event which I am overriding creating an infinate loop, thus I hacked with this i = 0 thing
// which is not good and should go away
let i = 0
//override document paste event handler (paste event bubbles from element to document)
document.querySelector("body").addEventListener("paste", (event) => {
    if (i % 2 === 1) {
        ++i
        return
    }
    userInputContainer.style.setProperty("visibility", "visible", "important")
    const currentFocus = document.activeElement
    userInput.focus()

    handleClickOutside(userInputContainer)

    onSubmit = (e) => {
        const inputValue = userInput.value
        userInput.value = ""
        userInputContainer.style.setProperty("visibility", "hidden", "important")

        browser.storage.local.get(inputValue).then(data => {
            console.log(currentFocus)
            currentFocus.focus()
            console.log(currentFocus)
            navigator.clipboard.writeText(data[inputValue]).then(
                document.execCommand("paste")
            )
        })
        e.preventDefault()
    }
    event.preventDefault()
    ++i;
})

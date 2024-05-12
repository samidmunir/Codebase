const body = document.body;
const control_div = document.getElementById('control-div');
const slider_div = document.getElementById('slider-div');
const main_div = document.getElementById('main-div');
control_div.addEventListener('click', () => {
    if (slider_div.style.float == 'left') {
        slider_div.style.float = 'right';
        body.style.backgroundColor = '#000000';
        main_div.style.color = '#0099ff';
    } else {
        slider_div.style.float = 'left';
        body.style.backgroundColor = '#ffffff';
        main_div.style.color = '#000000';
    }
});
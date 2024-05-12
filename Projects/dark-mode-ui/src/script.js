const body = document.body;
const control_div = document.getElementById('control-div');
const slider_div = document.getElementById('slider-div');
control_div.addEventListener('click', () => {
    if (slider_div.style.float == 'left') {
        slider_div.style.float = 'right';
    } else {
        slider_div.style.float = 'left';
    }
});
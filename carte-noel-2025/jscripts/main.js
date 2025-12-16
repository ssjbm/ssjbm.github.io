const create = (tag, classname=null, content=null) => {
    const elm = document.createElement(tag);
    if(classname) elm.className = classname;
    if(content) elm.innerHTML = content;
    return elm;
}
HTMLElement.prototype.create = function(tag, classname=null, content=null) {
    const elm = create(tag, classname, content);
    this.append(elm);
    return elm;
}

const rnd = (min=0, max=1) => Math.random() * (max - min) + min;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));




const ChristmasCard = {
	
	snowflakes: 40,



	init: function() {
		const flakes = ["❄", "❅", "❆"];
		// const snowfield = document.body.create('div', 'snowfield');
		const snowfield = document.body.querySelector('div.snowfield');

		const snowflakes = Promise.all([...Array(this.snowflakes).keys()].map(async i => {
			const duration  = 3 + (0.5 * (Math.floor(Math.random() * 20) + 1));
			const delay     = (0 - (Math.random() * duration)).toFixed(2);
			const delay2    = (0 - (Math.random() * 2)).toFixed(2);
			const flake     = flakes[Math.floor(Math.random() * flakes.length)];
			const size      = (Math.random() * 2) + 1;
			const snowflake = create('div');
			snowflake.create('div');
			snowflake.style.animationDelay = `${delay}s`;
			snowflake.style.animationDuration = `${duration}s`;
			snowflake.style.fontSize = `${size}vmin`;
			snowflake.style.setProperty('--delay', `${delay2}s`);
			snowflake.style.setProperty('--flake', `"${flake}"`);
			return snowflake;
		}));


		document.body.create('div', 'ssjb-logo');

		return new Promise(res => Promise.all([
			new Promise(async res => res(snowfield.append(...(await snowflakes)))),
			// new Promise(async res => res(document.body.append(...(await fishes))))
		]).then(() => res(this)));

		return this;
	}
}.init();
var wavelength = 580, coarseWavelength = 580, gauWavelength = 580, FWHM = 80, XYZ2RGB = s_XYZ2RGB;
const RGB2HEX = (r, g, b) => ((r << 16) + (g << 8) + b).toString(16).padStart(6, '0');
function setColorSpace(index) {
	switch (index) {
	case 1:
		XYZ2RGB = s_XYZ2RGB;
		break;
	case 2:
		XYZ2RGB = Adobe_XYZ2RGB;
		break;
	case 3:
		XYZ2RGB = ProPhoto_XYZ2RGB;
		break;
	case 4:
		XYZ2RGB = CIE_XYZ2RGB;
		break;
	}
	wl2c(wavelength);
	gauWl2c(gauWavelength, FWHM);
}
function setWavelengthInput(wl) {
	wavelength = Number(wl);
	coarseWavelength = wavelength;
	var wavelengthCoarseSlide = document.getElementById("wavelengthCoarseSlide");
	var wavelengthFineSlide = document.getElementById("wavelengthFineSlide");
	wavelengthCoarseSlide.value = wavelength;
	wavelengthFineSlide.value = 0;
	wl2c(wavelength);
}
function setWavelengthCoarse(wl) {
	wavelength = Number(wl);
	coarseWavelength = wavelength;
	var wavelengthInput = document.getElementById("wavelengthInput");
	var wavelengthFineSlide = document.getElementById("wavelengthFineSlide");
	wavelengthInput.value = wavelength;
	wavelengthFineSlide.value = 0;
	wl2c(wavelength);
}
function setWavelengthFine(offset) {
	wavelength = coarseWavelength
	wavelength += Number(offset);
	var wavelengthInput = document.getElementById("wavelengthInput");
	var wavelengthCoarseSlide = document.getElementById("wavelengthCoarseSlide");
	wavelengthInput.value = wavelength;
	wavelengthCoarseSlide.value = wavelength;
	wl2c(wavelength);
}
function wl2c(wl) {
	var index = Math.round((wl - 390) / 0.1);
	var XYZ = normalize(xyz[index].slice(-3));
	var RGB = math.multiply(XYZ2RGB, XYZ);

	RGB = math.round(scale(RGB));
	var colorDiv = document.getElementById("color");
	colorDiv.style.backgroundColor = 'rgb(' + RGB + ')';
	colorRGB = document.getElementById("colorRGB");
	colorRGB.innerHTML = RGB;
	colorHEX = document.getElementById("colorHEX");
	colorHEX.innerHTML = '#' + RGB2HEX(RGB[0], RGB[1], RGB[2]);

	var RGBLight = math.multiply(255, normalize(RGB));
	var colorLightDiv = document.getElementById("colorLight");
	colorLightDiv.style.backgroundColor = 'rgb(' + RGBLight + ')';

	var cplyRGB = math.subtract([255,255,255], RGB);
	var complementaryColorDiv = document.getElementById("complementaryColor");
	complementaryColorDiv.style.backgroundColor = 'rgb(' + cplyRGB + ')';

	var cplyRGBLight = math.multiply(255, normalize(cplyRGB));
	var complementaryColorLightDiv = document.getElementById("complementaryColorLight");
	complementaryColorLightDiv.style.backgroundColor = 'rgb(' + cplyRGBLight + ')';
}
function setGauWavelengthInput(wl) {
	gauWavelength = Number(wl);
	var gauWavelengthSlide = document.getElementById("gauWavelengthSlide");
	gauWavelengthSlide.value = gauWavelength;
	gauWl2c(gauWavelength, FWHM);
}
function setGauWavelengthSlide(wl) {
	gauWavelength = Number(wl);
	var gauWavelengthInput = document.getElementById("gauWavelengthInput");
	gauWavelengthInput.value = gauWavelength;
	gauWl2c(gauWavelength, FWHM);
}
function setFWHMInput(fwhm) {
	FWHM = Number(fwhm);
	var FWHMSlide = document.getElementById("FWHMSlide");
	FWHMSlide.value = FWHM;
	gauWl2c(gauWavelength, FWHM);
}
function setFWHMSlide(fwhm) {
	FWHM = Number(fwhm);
	var FWHMInput = document.getElementById("FWHMInput");
	FWHMInput.value = FWHM;
	gauWl2c(gauWavelength, FWHM);
}
function gauWl2c(wl, fwhm) {
	var sigma = fwhm / (2 * Math.sqrt(2 * Math.log(2)));
	var x = math.range(390.0, 830.1, 0.1);
	var coef = 1 / (sigma * Math.sqrt(2 * Math.PI));
	var y = math.multiply(coef, math.map(math.multiply(-0.5, math.divide(math.map(math.subtract(x, wl), math.square), sigma**2)), math.exp));
	y = y._data;
	var XYZ = [];
	XYZ[0] = math.multiply(0.1, math.dot(y, math.column(xyz, 1)));
	XYZ[1] = math.multiply(0.1, math.dot(y, math.column(xyz, 2)));
	XYZ[2] = math.multiply(0.1, math.dot(y, math.column(xyz, 3)));
	var RGB = math.multiply(XYZ2RGB, normalize(XYZ));
	RGB = math.round(scale(RGB));
	var gauColorDiv = document.getElementById("gauColor");
	gauColorDiv.style.backgroundColor = 'rgb(' + RGB + ')';
	gauColorRGB = document.getElementById("gauColorRGB");
	gauColorRGB.innerHTML = RGB;
	gauColorHEX = document.getElementById("gauColorHEX");
	gauColorHEX.innerHTML = '#' + RGB2HEX(RGB[0], RGB[1], RGB[2]);

	var RGBLight = math.multiply(255, normalize(RGB));
	var gauColorLightDiv = document.getElementById("gauColorLight");
	gauColorLightDiv.style.backgroundColor = 'rgb(' + RGBLight + ')';

	var cplyRGB = math.subtract([255,255,255], RGB);
	var gauComplementaryColorDiv = document.getElementById("gauComplementaryColor");
	gauComplementaryColorDiv.style.backgroundColor = 'rgb(' + cplyRGB + ')';

	var cplyRGBLight = math.multiply(255, normalize(cplyRGB));
	var gauComplementaryColorLightDiv = document.getElementById("gauComplementaryColorLight");
	gauComplementaryColorLightDiv.style.backgroundColor = 'rgb(' + cplyRGBLight + ')';
}
function scale(array) {
	var ans = [];
	array.forEach(function (element, index, arr) {
		if (element < 0)
			ans[index] = 0;
		else if (element > 1)
			ans[index] = 255;
		else
			ans[index] = 255 * element;
	})
	return ans;
}
function normalize(array) {
	var ans = [];
	var max = Math.max(...array);
	array.forEach(function (element, index) {
		ans[index] = element / max;
	});
	return ans;
}
function copy(text) {
	var copyipt = document.createElement("input");
	copyipt.setAttribute("value", text);
	document.body.appendChild(copyipt);
	copyipt.select();
	document.execCommand("copy");
	document.body.removeChild(copyipt);
}
function copyRGB(event) {
	var text = document.getElementById("colorRGB").innerHTML;
	copy(text);
	copySucc(event.pageX, event.pageY, text);
}
function copyHEX(event) {
	var text = document.getElementById("colorHEX").innerHTML;
	copy(text);
	copySucc(event.pageX, event.pageY, text);
}
function copyGauRGB(event) {
	var text = document.getElementById("gauColorRGB").innerHTML;
	copy(text);
	copySucc(event.pageX, event.pageY, text);
}
function copyGauHEX(event) {
	var text = document.getElementById("gauColorHEX").innerHTML;
	copy(text);
	copySucc(event.pageX, event.pageY, text);
}
function copyColor(event, rgb) {
	console.log(event.pageX, event.pageY)
	rgb = rgb.substring(4, rgb.length - 1);
	RGB = rgb.split(',');
	RGB = RGB.map(Number);
	var text = '#' + RGB2HEX(RGB[0], RGB[1], RGB[2]);
	copy(text);
	copySucc(event.pageX, event.pageY, text);
}
function copySucc(x, y, text) {
	var span = document.createElement('span');
	span.innerHTML = '<i class="fas fa-clipboard-check"></i>&nbsp;copied';
	span.className = 'text';
	span.style.top = y - 20 + 'px';
	span.style.left = x - 30 + 'px';
	span.style.animation = 'remove 2.5s';
	document.body.appendChild(span);
	setTimeout(function () {
    	span.remove();
	}, 2000);
}
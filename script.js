window.onload = () => {
	let container = document.getElementById("container-file");
	container.addEventListener("change", unpackContainer, false);
	let content = document.getElementById("content-file");
	content.addEventListener("change", packContainer, false);
	let saveButton = document.getElementsByClassName("save")[0];
	saveButton.addEventListener("click", saveMatryoshka, false)
	if (container.files.length > 0)
		unpackContainer();
	if (content.files.length > 0)
		packContainer();
}

function unpackContainer() {
	let container = document.getElementById("container-file");
	let reader = new FileReader();
	reader.onload = function () {
		let arrayBuffer = this.result,
			array = new Uint8Array(arrayBuffer);
		let imgs = document.getElementsByClassName("matryoshka")[0];
		while (imgs.firstChild) imgs.removeChild(imgs.firstChild);
		for (let matryoshka of unpackMatryoshka(array)) {
			let img = document.createElement("img");
			let blob = new Blob([matryoshka], { type: "image/jpeg" });
			img.src = URL.createObjectURL(blob);
			imgs.appendChild(img);
		}
	}
	reader.readAsArrayBuffer(container.files[0]);
}

function packContainer() {
	let containerElement = document.getElementById("container-file");
	let content = document.getElementById("content-file");
	let file1 = containerElement.files[0];
	let file2 = content.files[0];
	readFile(file1, (bigMatryoshka) => readFile(file2, (content) => {
		let container = new Uint8Array([]);
		for (let matryoshka of unpackMatryoshka(bigMatryoshka))
			container = concatArrays(container, matryoshka);
		container = concatArrays(container, content);
		let matryoshka = new File([container], file1.name, {
			type: "image/jpeg",
			lastModified: new Date(),
		});
		const dataTransfer = new DataTransfer();
		dataTransfer.items.add(matryoshka);
		containerElement.files = dataTransfer.files;
		let event = new Event("change");
		containerElement.dispatchEvent(event);
		content.value = "";
	}));

}

function saveMatryoshka() {
	let container = document.getElementById("container-file");
	let invisibleLink = document.createElement("a");
	let file = container.files[0];
	invisibleLink.setAttribute("href", URL.createObjectURL(file));
	invisibleLink.setAttribute("download", container.files[0].name);
	invisibleLink.click();
}

function* unpackMatryoshka(jpeg_bytes) {
	let i = 0;
	const markers = [...("c0 c1 c2 c4 db da fe".split(" ")), ...Array.from({ length: 10 }, (_, i) => `e${i}`)];
	while (i < jpeg_bytes.length) {
		const marker = jpeg_bytes.slice(i, i + 2).reduce((acc, val) => acc + val.toString(16).padStart(2, "0"), "");
		let size = 2;
		if (marker.slice(0, 2) !== "ff") {
			return;
		} else if (marker === "ffd9") {
			break;
		} else if (markers.includes(marker.slice(2))) {
			size = parseInt(jpeg_bytes.slice(i + 2, i + 4).reduce((acc, val) => acc + val.toString(16).padStart(2, "0"), ""), 16) + 2;
			if (marker === "ffda") {
				let j = i + size;
				while (j + 1 < jpeg_bytes.length && (jpeg_bytes[j] !== 0xFF || jpeg_bytes[j + 1] === 0)) {
					j += 1;
				}
				size = j - i;
			}
		}
		i += size;
	}
	yield jpeg_bytes.slice(0, i + 2);
	if (i + 8 < jpeg_bytes.length) {
		yield* unpackMatryoshka(jpeg_bytes.slice(i + 2));
	}
}

function concatArrays(array1, array2) {
	let concatenation = new Uint8Array(array1.length + array2.length);
	concatenation.set(array1);
	concatenation.set(array2, array1.length);
	return concatenation;
}

function readFile(file, f) {
	let reader = new FileReader();
	reader.onload = function () {
		let arrayBuffer = this.result,
			array = new Uint8Array(arrayBuffer);
		f(array);
	}
	reader.readAsArrayBuffer(file);
}

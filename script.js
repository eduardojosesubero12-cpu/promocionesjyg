/* =========================================================
   SIDEBAR: ITEM ACTIVO
========================================================= */
const allSideMenu = document.querySelectorAll('#sidebar .side-menu.top li a');

allSideMenu.forEach(item => {
	const li = item.parentElement;

	item.addEventListener('click', function () {
		// Quitar active de todos
		allSideMenu.forEach(i => {
			i.parentElement.classList.remove('active');
		});

		// Activar el actual
		li.classList.add('active');
	});
});



/* =========================================================
   SIDEBAR: TOGGLE (COLAPSAR / EXPANDIR)
========================================================= */
const menuBar = document.querySelector('#content nav .bx.bx-menu');
const sidebar = document.getElementById('sidebar');

menuBar.addEventListener('click', function () {
	sidebar.classList.toggle('hide');
});



/* =========================================================
   SEARCH: COMPORTAMIENTO RESPONSIVE
========================================================= */
const searchButton = document.querySelector('#content nav form .form-input button');
const searchButtonIcon = document.querySelector('#content nav form .form-input button .bx');
const searchForm = document.querySelector('#content nav form');

searchButton.addEventListener('click', function (e) {
	if (window.innerWidth < 576) {
		e.preventDefault();

		// Mostrar / ocultar buscador
		searchForm.classList.toggle('show');

		// Cambiar icono
		if (searchForm.classList.contains('show')) {
			searchButtonIcon.classList.replace('bx-search', 'bx-x');
		} else {
			searchButtonIcon.classList.replace('bx-x', 'bx-search');
		}
	}
});



/* =========================================================
   UI: ESTADO INICIAL RESPONSIVE
========================================================= */
if (window.innerWidth < 768) {
	sidebar.classList.add('hide');
} else if (window.innerWidth > 576) {
	searchButtonIcon.classList.replace('bx-x', 'bx-search');
	searchForm.classList.remove('show');
}



/* =========================================================
   UI: AJUSTE EN RESIZE
========================================================= */
window.addEventListener('resize', function () {
	if (this.innerWidth > 576) {
		searchButtonIcon.classList.replace('bx-x', 'bx-search');
		searchForm.classList.remove('show');
	}
});



/* =========================================================
   DARK MODE: TOGGLE
========================================================= */
const switchMode = document.getElementById('switch-mode');

switchMode.addEventListener('change', function () {
	if (this.checked) {
		document.body.classList.add('dark');
	} else {
		document.body.classList.remove('dark');
	}
});

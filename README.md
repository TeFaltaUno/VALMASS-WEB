# VALMASS WEB V1 · "Despertá el grano"

Web de **Valmass Café de Especialidad**, en Balcarce 510, San Miguel de Tucumán.
Es un sitio estático, igual que FAT-WEB: HTML, CSS y JavaScript propio, más Three.js desde CDN. No necesita instalar nada ni compilar.

## Orden
0. **Entrada:** el logo, una barra de carga y el botón ENTRAR (que activa la música) o "entrar sin sonido".
1. **Hero:** grano de café 3D hecho por código, que sigue al mouse. Al bajar, el título "Despertá el grano" se abre y los granos vuelan hacia la cámara.
2. **Marquesina amarilla** que se acelera con el scroll.
3. **01 · El arte:** el latte art en la taza amarilla. El video avanza cuadro a cuadro con el scroll y al final se expande a pantalla completa.
4. **02 · La extracción:** molienda, distribución, tampeo y extracción, con una línea de tiempo.
5. **03 · Orígenes:** Brasil Paraíso y Colombia Palmera en tarjetas 3D, con una lluvia de granos detrás, y la bolsa dibujada a mano.
6. **04 · Filtrado:** el video del V60 controlado por el scroll mientras se dibuja la ilustración de la pared.
7. **05 · ICE latte:** fondo frío con hielo que cae.
8. **Hecho a mano:** la taza de la pared se dibuja sola, con una frase del local.
9. **06 · Carta:** pestañas Café / Para acompañar. En compu, la foto sigue al mouse; en celular, se abre al tocar.
10. **07 · El lugar:** galería horizontal con parallax.
11. **Video** que se expande a pantalla completa ("Las tardes en Valmass son magia").
12. **08 · Visitanos:** dirección, horarios, mapa y botones para cómo llegar e Instagram.
13. **Footer** amarillo con el logo gigante.

## Archivos
- `index.html` · `style.css` · `script.js` (motor de scroll, secuencias y música) · `beans.js` (granos 3D)
- `assets/seq/*`: cuadros de los videos para el scroll (latte, espresso, filtro, ice)
- `assets/img`: fotos sacadas de los reels de @valmass.cafe
- `assets/svg`: dibujos de la pared del local, vectorizados
- `assets/video`: videos comprimidos con sus portadas

## Música
Arranca al tocar ENTRAR. Es un lo-fi original generado en el navegador, sin derechos de terceros.
Si subís un `musica.mp3` a la raíz del repo, se usa ese tema en su lugar.

## Pendientes para el cliente
- **Logo:** el wordmark "valmass" está escrito con la tipografía Outfit. Si te pasan el logo en SVG, reemplazalo en `.wordmark`.
- **Notas de cata** de Brasil Paraíso y Colombia Palmera, y **precios**: no figuran en los posts, así que no los inventé.
- **WhatsApp:** si lo tienen, agregalo como botón en la sección Visitanos.

## Publicación (GitHub Pages)
1. Subí todo el contenido de esta carpeta a la raíz del repo.
2. En el repo, entrá a Settings → Pages → Branch: `main` / root → Save.

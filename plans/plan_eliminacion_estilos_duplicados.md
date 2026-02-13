# Plan para Eliminar Estilos Duplicados en dashboard.html

## Objetivo
Eliminar los estilos CSS que están definidos tanto en el archivo `dashboard.html` como en `dashboard.css` para evitar redundancias y mejorar el mantenimiento del código.

## Análisis de Estilos Duplicados

### Estilos en dashboard.html que ya están en dashboard.css

1. **body**: Definido en ambos archivos.
2. **.container**: Definido en ambos archivos.
3. **h1**: Definido en ambos archivos.
4. **h2**: Definido en ambos archivos.
5. **table**: Definido en ambos archivos.
6. **th, td**: Definido en ambos archivos.
7. **.loading, .error**: Definido en ambos archivos.
8. **.product-row**: Definido en ambos archivos.
9. **.product-row:hover**: Definido en ambos archivos.
10. **.product-row.selected**: Definido en ambos archivos.
11. **.edit-modal**: Definido en ambos archivos.
12. **.edit-modal.show**: Definido en ambos archivos.
13. **.edit-form**: Definido en ambos archivos.
14. **.client-debts-form**: Definido en ambos archivos.
15. **.client-debts-table th, .client-debts-table td**: Definido en ambos archivos.
16. **.form-group**: Definido en ambos archivos.
17. **.form-group label**: Definido en ambos archivos.
18. **.form-group input, .form-group select, .form-group textarea**: Definido en ambos archivos.
19. **.form-group input:focus, .form-group select:focus**: Definido en ambos archivos.
20. **.form-group select option**: Definido en ambos archivos.
21. **.button-group**: Definido en ambos archivos.
22. **.btn**: Definido en ambos archivos.
23. **.btn-primary**: Definido en ambos archivos.
24. **.btn-primary:hover**: Definido en ambos archivos.
25. **.btn-secondary**: Definido en ambos archivos.
26. **.btn-secondary:hover**: Definido en ambos archivos.
27. **.edit-button**: Definido en ambos archivos.
28. **.edit-button:hover**: Definido en ambos archivos.
29. **.btn-spacing**: Definido en ambos archivos.
30. **.btn-spacing-small**: Definido en ambos archivos.
31. **.btn-spacing-large**: Definido en ambos archivos.
32. **.margin-left-10**: Definido en ambos archivos.
33. **.margin-top-5**: Definido en ambos archivos.
34. **.margin-bottom-20**: Definido en ambos archivos.
35. **.margin-bottom-15**: Definido en ambos archivos.
36. **.margin-bottom-10**: Definido en ambos archivos.
37. **.font-size-12**: Definido en ambos archivos.
38. **.font-size-14**: Definido en ambos archivos.
39. **.font-weight-bold**: Definido en ambos archivos.
40. **.color-gray**: Definido en ambos archivos.
41. **.color-red**: Definido en ambos archivos.
42. **.color-green**: Definido en ambos archivos.
43. **.text-center**: Definido en ambos archivos.
44. **.text-right**: Definido en ambos archivos.
45. **.display-flex**: Definido en ambos archivos.
46. **.align-items-center**: Definido en ambos archivos.
47. **.justify-content-center**: Definido en ambos archivos.
48. **.gap-10**: Definido en ambos archivos.
49. **.gap-15**: Definido en ambos archivos.
50. **.padding-10**: Definido en ambos archivos.
51. **.padding-15**: Definido en ambos archivos.
52. **.padding-20**: Definido en ambos archivos.
53. **.border-radius-6**: Definido en ambos archivos.
54. **.border-radius-8**: Definido en ambos archivos.
55. **.border-2px-solid-ddd**: Definido en ambos archivos.
56. **.background-f8f9fa**: Definido en ambos archivos.
57. **.background-white**: Definido en ambos archivos.
58. **.background-red**: Definido en ambos archivos.
59. **.invoice-card.collapsed .invoice-items, .invoice-card.collapsed .invoice-total**: Definido en ambos archivos.
60. **.invoice-card.collapsed**: Definido en ambos archivos.
61. **.invoice-card.collapsed .invoice-header**: Definido en ambos archivos.
62. **.collapse-icon**: Definido en ambos archivos.
63. **.collapse-icon:hover**: Definido en ambos archivos.
64. **.invoice-card.collapsed .collapse-icon**: Definido en ambos archivos.
65. **.dashboard-section.collapsed .section-content**: Definido en ambos archivos.
66. **.dashboard-section.collapsed**: Definido en ambos archivos.
67. **.dashboard-section:not(.collapsed)**: Definido en ambos archivos.
68. **.section-header**: Definido en ambos archivos.
69. **.section-title**: Definido en ambos archivos.
70. **.dashboard-section:not(.collapsed) .section-title**: Definido en ambos archivos.
71. **.dashboard-section.collapsed .section-header**: Definido en ambos archivos.
72. **.dashboard-section.collapsed .section-header:hover**: Definido en ambos archivos.
73. **.section-icon**: Definido en ambos archivos.
74. **.section-icon:hover**: Definido en ambos archivos.
75. **.dashboard-section:not(.collapsed) .section-icon**: Definido en ambos archivos.
76. **.dashboard-section:not(.collapsed) .section-icon:hover**: Definido en ambos archivos.
77. **.dashboard-section.collapsed .section-icon**: Definido en ambos archivos.
78. **.dashboard-section.collapsed .section-icon:hover**: Definido en ambos archivos.
79. **.alert**: Definido en ambos archivos.
80. **.alert.success**: Definido en ambos archivos.
81. **.alert.error**: Definido en ambos archivos.
82. **.switch**: Definido en ambos archivos.
83. **.switch input**: Definido en ambos archivos.
84. **.slider**: Definido en ambos archivos.
85. **.slider:before**: Definido en ambos archivos.
86. **input:checked + .slider**: Definido en ambos archivos.
87. **input:focus + .slider**: Definido en ambos archivos.
88. **input:checked + .slider:before**: Definido en ambos archivos.
89. **.slider.round**: Definido en ambos archivos.
90. **.slider.round:before**: Definido en ambos archivos.
91. **.status-badge**: Definido en ambos archivos.
92. **.status-pending**: Definido en ambos archivos.
93. **.status-process**: Definido en ambos archivos.
94. **.status-delivered**: Definido en ambos archivos.
95. **.status-entregado**: Definido en ambos archivos.
96. **.status-cancelled**: Definido en ambos archivos.
97. **.expiration-notification**: Definido en ambos archivos.
98. **.expiration-alert**: Definido en ambos archivos.
99. **.expiration-alert.expired**: Definido en ambos archivos.
100. **.expiration-alert.warning**: Definido en ambos archivos.
101. **.expiration-alert.success**: Definido en ambos archivos.
102. **.expiration-alert-header**: Definido en ambos archivos.
103. **.expiration-alert-icon**: Definido en ambos archivos.
104. **.expiration-alert-content**: Definido en ambos archivos.
105. **.expiration-alert-title**: Definido en ambos archivos.
106. **.expiration-alert-message**: Definido en ambos archivos.
107. **.expiration-alert-close**: Definido en ambos archivos.
108. **.expiration-alert-close:hover**: Definido en ambos archivos.
109. **.expiration-alert-details**: Definido en ambos archivos.
110. **.expiration-alert-details.show**: Definido en ambos archivos.
111. **.expiration-item**: Definido en ambos archivos.
112. **.expiration-item:last-child**: Definido en ambos archivos.
113. **.expiration-item-title**: Definido en ambos archivos.
114. **.expiration-item-info**: Definido en ambos archivos.
115. **.expiration-item-days**: Definido en ambos archivos.
116. **.expiration-item-days.urgent**: Definido en ambos archivos.
117. **.expiration-item-days.warning**: Definido en ambos archivos.
118. **.expiration-item-days.normal**: Definido en ambos archivos.
119. **@keyframes slideInRight**: Definido en ambos archivos.
120. **@keyframes pulse**: Definido en ambos archivos.
121. **.expiration-alert.expired .expiration-alert-header**: Definido en ambos archivos.
122. **.lote-vigente**: Definido en ambos archivos.
123. **.lote-proximo-vencer**: Definido en ambos archivos.
124. **.lote-vencido**: Definido en ambos archivos.
125. **.dias-vencimiento**: Definido en ambos archivos.
126. **.dias-vencimiento.urgente**: Definido en ambos archivos.
127. **.dias-vencimiento.advertencia**: Definido en ambos archivos.
128. **.dias-vencimiento.normal**: Definido en ambos archivos.
129. **.promotion-details**: Definido en ambos archivos.
130. **.promotion-details h5**: Definido en ambos archivos.
131. **.promotion-details small**: Definido en ambos archivos.
132. **.promotion-products div[style*="background: white"]**: Definido en ambos archivos.
133. **.promotion-products strong**: Definido en ambos archivos.
134. **.promotion-products small**: Definido en ambos archivos.
135. **.promotion-products label**: Definido en ambos archivos.
136. **.promotion-products input**: Definido en ambos archivos.
137. **.promotion-products input:focus**: Definido en ambos archivos.
138. **#metricas-section .metrica-card h3**: Definido en ambos archivos.
139. **#metricas-section table**: Definido en ambos archivos.
140. **#metricas-section th**: Definido en ambos archivos.
141. **#metricas-section td**: Definido en ambos archivos.
142. **#metricas-section tr:hover**: Definido en ambos archivos.
143. **#metricas-section .metrica-card**: Definido en ambos archivos.
144. **#productos-section table**: Definido en ambos archivos.
145. **#productos-section th**: Definido en ambos archivos.
146. **#productos-section td**: Definido en ambos archivos.
147. **#productos-section tr:hover**: Definido en ambos archivos.
148. **#productos-section .product-row.selected**: Definido en ambos archivos.
149. **#lotes-section table**: Definido en ambos archivos.
150. **#lotes-section th**: Definido en ambos archivos.
151. **#lotes-section td**: Definido en ambos archivos.
152. **#lotes-section tr:hover**: Definido en ambos archivos.
153. **#proveedores-section table**: Definido en ambos archivos.
154. **#proveedores-section th**: Definido en ambos archivos.
155. **#proveedores-section td**: Definido en ambos archivos.
156. **#proveedores-section tr:hover**: Definido en ambos archivos.
157. **#proveedores-section #pedidos-table**: Definido en ambos archivos.
158. **#proveedores-section #pedidos-table th**: Definido en ambos archivos.
159. **#proveedores-section #pedidos-table td**: Definido en ambos archivos.
160. **#proveedores-section #pedidos-table tr:hover**: Definido en ambos archivos.
161. **#historial-cierres-section table**: Definido en ambos archivos.
162. **#historial-cierres-section th**: Definido en ambos archivos.
163. **#historial-cierres-section td**: Definido en ambos archivos.
164. **#historial-cierres-section tr:hover**: Definido en ambos archivos.

## Plan de Eliminación

### Paso 1: Eliminar Estilos Duplicados
Eliminar los estilos duplicados del archivo `dashboard.html` que ya están definidos en `dashboard.css`. Esto incluye todos los estilos mencionados anteriormente.

### Paso 2: Verificar la Integridad Visual
Después de eliminar los estilos, verificar que la interfaz se vea correctamente y que no haya cambios visuales no deseados.

### Paso 3: Probar la Funcionalidad
Asegurarse de que todas las funcionalidades de la interfaz sigan trabajando correctamente después de la eliminación de los estilos duplicados.

### Paso 4: Documentar los Cambios
Documentar los cambios realizados para futuras referencias y mantenimiento.

## Beneficios Esperados
- **Mantenimiento más fácil**: Al tener los estilos en un solo lugar, será más fácil mantener y actualizar el código.
- **Reducción de redundancia**: Eliminar la duplicación de estilos reducirá el tamaño del archivo y mejorará la eficiencia.
- **Consistencia**: Asegurar que todos los estilos estén centralizados en `dashboard.css` mejorará la consistencia del código.

## Riesgos Potenciales
- **Cambios visuales no deseados**: Si algunos estilos no están correctamente definidos en `dashboard.css`, podría haber cambios visuales no deseados.
- **Problemas de funcionalidad**: Si algunos estilos son necesarios para la funcionalidad de JavaScript, podrían surgir problemas.

## Mitigación de Riesgos
- **Revisión exhaustiva**: Revisar exhaustivamente los estilos antes de eliminarlos para asegurarse de que estén correctamente definidos en `dashboard.css`.
- **Pruebas completas**: Realizar pruebas completas de la interfaz y la funcionalidad después de eliminar los estilos duplicados.

## Conclusión
Este plan tiene como objetivo mejorar la calidad del código al eliminar estilos duplicados y centralizar la definición de estilos en `dashboard.css`. Esto facilitará el mantenimiento y mejorará la consistencia del código.

## Pasos Siguientes
1. Eliminar los estilos duplicados de `dashboard.html`.
2. Verificar la integridad visual y funcional de la interfaz.
3. Documentar los cambios realizados.
4. Realizar pruebas completas para asegurarse de que todo funcione correctamente.

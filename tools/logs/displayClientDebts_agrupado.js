/**
 * FUNCIÓN AGRUPADA POR FACTURA PARA TABLA DE CUENTAS CORRIENTES
 * =================================================================
 * Reemplaza la función displayClientDebts en frontend/dashboard.js
 * 
 * Esta versión agrupa los productos por número de factura, mostrando:
 * - Un encabezado colapsable por cada factura
 * - Total pendiente por factura
 * - Diferencia de precios por factura
 * - Productos expandibles debajo de cada factura
 * - Botón "Pagar Factura Completa"
 * 
 * Cómo usar:
 * 1. Abre frontend/dashboard.js
 * 2. Busca la función "function displayClientDebts(deudas)" (alrededor de línea 2181)
 * 3. Reemplaza toda la función con el código de abajo
 */

function displayClientDebts(deudas) {
    const content = document.getElementById('clientDebtsContent');

    if (!deudas || deudas.length === 0) {
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <h4 style="color: #ffffff;">No hay deudas registradas</h4>
                <p>Este cliente no tiene deudas pendientes en este momento.</p>
            </div>
        `;
        return;
    }

    // ============================================
    // AGRUPAR DEUDAS POR NÚMERO DE FACTURA
    // ============================================
    const facturasAgrupadas = {};
    
    deudas.forEach(deuda => {
        const numeroFactura = deuda.venta_numero_factura || 'SIN_FACTURA';
        
        if (!facturasAgrupadas[numeroFactura]) {
            facturasAgrupadas[numeroFactura] = {
                fecha: deuda.venta_fecha,
                productos: [],
                estado: deuda.estado,
                totalOriginal: 0,
                totalActual: 0,
                totalPendiente: 0
            };
        }
        
        // Calcular montos con cantidad
        const cantidad = deuda.producto_cantidad || 1;
        const precioOriginalTotal = parseFloat(deuda.precio_unitario || 0) * cantidad;
        const precioActualTotal = parseFloat(deuda.precio_actual_producto || 0) * cantidad;
        const pendienteRecalc = precioActualTotal;
        
        facturasAgrupadas[numeroFactura].productos.push({
            ...deuda,
            cantidad: cantidad,
            precioOriginalTotal: precioOriginalTotal,
            precioActualTotal: precioActualTotal,
            pendienteRecalc: pendienteRecalc
        });
        
        facturasAgrupadas[numeroFactura].totalOriginal += precioOriginalTotal;
        facturasAgrupadas[numeroFactura].totalActual += precioActualTotal;
        facturasAgrupadas[numeroFactura].totalPendiente += pendienteRecalc;
    });

    // Calcular totales generales
    const totalPendiente = Object.values(facturasAgrupadas).reduce((sum, f) => sum + f.totalPendiente, 0);
    const facturasPendientes = Object.values(facturasAgrupadas).filter(f => f.productos.some(p => p.estado === 'pendiente')).length;
    const facturasVencidas = Object.values(facturasAgrupadas).filter(f => f.productos.some(p => p.estado === 'vencida')).length;

    let deudasHtml = `
        <div style="background: #2d2d2d; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 15px 0; color: #ffffff;">Resumen de Deudas</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div style="background: #3d3d3d; padding: 15px; border-radius: 6px; text-align: center;">
                    <strong style="color: #ffffff;">Total Pendiente:</strong>
                    <div style="font-size: 18px; font-weight: bold; color: #28a745; margin-top: 5px;">${formatCurrency(totalPendiente)}</div>
                </div>
                <div style="background: #3d3d3d; padding: 15px; border-radius: 6px; text-align: center;">
                    <strong style="color: #ffffff;">Facturas Pendientes:</strong>
                    <div style="font-size: 18px; font-weight: bold; color: #ffc107; margin-top: 5px;">${facturasPendientes}</div>
                </div>
                <div style="background: #3d3d3d; padding: 15px; border-radius: 6px; text-align: center;">
                    <strong style="color: #ffffff;">Facturas Vencidas:</strong>
                    <div style="font-size: 18px; font-weight: bold; color: #dc3545; margin-top: 5px;">${facturasVencidas}</div>
                </div>
            </div>
        </div>

        <div style="background: #2d2d2d; padding: 20px; border-radius: 8px;">
            <h4 style="margin: 0 0 15px 0; color: #ffffff;">Detalles por Factura</h4>
            <div style="overflow-x: auto;">
    `;

    // ============================================
    // GENERAR GRUPOS DE FACTURAS (EXPANDIBLES)
    // ============================================
    const numerosFactura = Object.keys(facturasAgrupadas).sort().reverse();
    
    numerosFactura.forEach((numeroFactura, index) => {
        const factura = facturasAgrupadas[numeroFactura];
        const fechaFormateada = factura.fecha ? new Date(factura.fecha).toLocaleDateString('es-AR') : '-';
        
        // Determinar estado de la factura
        const estadosProductos = factura.productos.map(p => p.estado);
        const tieneVencida = estadosProductos.includes('vencida');
        const tienePendiente = estadosProductos.includes('pendiente');
        
        let estadoClass = '';
        let estadoText = '';
        if (tieneVencida) {
            estadoClass = 'lote-vencido';
            estadoText = 'Vencida';
        } else if (tienePendiente) {
            estadoClass = 'lote-proximo-vencer';
            estadoText = 'Pendiente';
        } else {
            estadoClass = 'lote-vigente';
            estadoText = 'Pagada';
        }
        
        // Calcular diferencia total de la factura
        const diferenciaTotal = factura.totalActual - factura.totalOriginal;
        const diferenciaClass = diferenciaTotal > 0 ? 'color: #dc3545;' : diferenciaTotal < 0 ? 'color: #28a745;' : '';
        const diferenciaDisplay = `${diferenciaTotal >= 0 ? '+' : ''}${formatCurrency(diferenciaTotal)}`;
        
        // Generar HTML de los productos de esta factura
        const productosHtml = factura.productos.map((producto, prodIndex) => {
            const nombreProducto = producto.producto_nombre;
            const cantidad = producto.cantidad || 1;
            const precioOriginalTotal = producto.precioOriginalTotal;
            const precioActualTotal = producto.precioActualTotal;
            const pendienteRecalc = producto.pendienteRecalc;
            
            let estadoProdClass = producto.estado === 'vencida' ? 'lote-vencido' : producto.estado === 'pendiente' ? 'lote-proximo-vencer' : 'lote-vigente';
            let estadoProdText = producto.estado === 'vencida' ? 'Vencida' : producto.estado === 'pendiente' ? 'Pendiente' : 'Pagada';
            const fechaVencimiento = producto.fecha_vencimiento ? new Date(producto.fecha_vencimiento).toLocaleDateString('es-AR') : '-';
            
            return `
                <tr class="factura-producto-row" data-factura="${numeroFactura}" style="${prodIndex > 0 ? 'display: none;' : ''} background: #353535;">
                    <td style="padding: 10px; border-bottom: 1px solid #555;">${nombreProducto}</td>
                    <td style="padding: 10px; text-align: right; border-bottom: 1px solid #555;">${cantidad}</td>
                    <td style="padding: 10px; text-align: right; border-bottom: 1px solid #555;">${formatCurrency(precioOriginalTotal)}</td>
                    <td style="padding: 10px; text-align: right; font-weight: bold; border-bottom: 1px solid #555;">${formatCurrency(precioActualTotal)}</td>
                    <td style="padding: 10px; text-align: right; font-weight: bold; ${diferenciaClass} border-bottom: 1px solid #555;">${formatCurrency(precioActualTotal - precioOriginalTotal)}</td>
                    <td style="padding: 10px; text-align: right; font-weight: bold; color: ${pendienteRecalc > 0 ? '#dc3545' : '#28a745'}; border-bottom: 1px solid #555;">${formatCurrency(pendienteRecalc)}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #555;">${fechaVencimiento}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #555;"><span class="status-badge ${estadoProdClass}">${estadoProdText}</span></td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #555;">
                        ${parseFloat(producto.monto_pendiente || 0) > 0 ? `
                            <button onclick="registerPayment(${producto.id}, ${precioActualTotal}, '${numeroFactura}')" style="background: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 5px;">Pagar</button>
                            <button onclick="showPaymentHistory(${producto.id})" style="background: #17a2b8; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">Historial</button>
                        ` : `
                            <span style="color: #28a745; font-weight: bold;">Pagada</span>
                        `}
                    </td>
                </tr>
            `;
        }).join('');

        // Determinar qué deuda usar para las acciones de la factura (la primera con saldo pendiente)
        const deudaConPendiente = factura.productos.find(p => parseFloat(p.monto_pendiente || 0) > 0);
        const deudaIdAccion = deudaConPendiente ? deudaConPendiente.id : factura.productos[0].id;
        const precioActualAccion = deudaConPendiente ? deudaConPendiente.precioActualTotal : factura.totalActual;
        
        // Crear el grupo de factura
        deudasHtml += `
            <div class="factura-grupo" style="margin-bottom: 15px; border: 1px solid #555; border-radius: 8px; overflow: hidden;">
                <!-- Encabezado de la Factura (siempre visible) -->
                <div class="factura-header" onclick="toggleFacturaGrupo(this)" style="background: #4a4a4a; padding: 15px; cursor: pointer; display: flex; align-items: center; justify-content: space-between;" data-factura="${numeroFactura}">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span class="factura-toggle-icon" style="font-size: 18px; color: #cccccc; transition: transform 0.3s;">▶</span>
                        <div>
                            <strong style="color: #ffffff; font-size: 16px;">Factura: ${numeroFactura}</strong>
                            <div style="color: #cccccc; font-size: 12px; margin-top: 3px;">
                                Fecha: ${fechaFormateada} | ${factura.productos.length} producto(s)
                            </div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: #ffffff; font-weight: bold; font-size: 16px;">
                            Pendiente: <span style="color: ${factura.totalPendiente > 0 ? '#dc3545' : '#28a745'};">${formatCurrency(factura.totalPendiente)}</span>
                        </div>
                        <div style="color: #cccccc; font-size: 12px;">
                            Diferencia: <span style="${diferenciaClass}">${diferenciaDisplay}</span>
                        </div>
                    </div>
                    <span class="status-badge ${estadoClass}" style="margin-left: 15px;">${estadoText}</span>
                </div>
                
                <!-- Tabla de productos (oculta inicialmente) -->
                <table class="client-debts-table" style="width: 100%; border-collapse: collapse; background: #3d3d3d; color: #ffffff; display: none;">
                    <thead>
                        <tr style="background: #555;">
                            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #666;">Producto</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 1px solid #666;">Cantidad</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 1px solid #666;">Precio Compra</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 1px solid #666;">Precio Actual</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 1px solid #666;">Diferencia</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 1px solid #666;">Pendiente</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #666;">Vencimiento</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #666;">Estado</th>
                            <th style="padding: 10px; text-align: center; border-bottom: 1px solid #666;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productosHtml}
                    </tbody>
                    <!-- Fila de total por factura -->
                    <tfoot>
                        <tr style="background: #2a2a2a; font-weight: bold;">
                            <td colspan="4" style="padding: 10px; text-align: right; border-bottom: 1px solid #555;">
                                <strong>TOTAL FACTURA:</strong>
                            </td>
                            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #555; ${diferenciaClass}">
                                ${diferenciaDisplay}
                            </td>
                            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #555; color: ${factura.totalPendiente > 0 ? '#dc3545' : '#28a745'};">
                                ${formatCurrency(factura.totalPendiente)}
                            </td>
                            <td colspan="3" style="padding: 10px; border-bottom: 1px solid #555;">
                                ${factura.totalPendiente > 0 ? `
                                    <button onclick="registerPayment(${deudaIdAccion}, ${precioActualAccion}, '${numeroFactura}')" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; margin-right: 10px;">💰 Pagar Factura Completa</button>
                                ` : `
                                    <span style="color: #28a745; font-weight: bold; font-size: 14px;">✓ Factura Cancelada</span>
                                `}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
    });

    deudasHtml += `
            </div>
        </div>
    `;

    // Agregar función toggle para expandir/contraer grupos de facturas
    content.innerHTML = debtsHtml;
    
    // Inyectar la función toggle en el scope global
    window.toggleFacturaGrupo = function(headerElement) {
        const facturaGrupo = headerElement.closest('.factura-grupo');
        const tabla = facturaGrupo.querySelector('table');
        const icono = headerElement.querySelector('.factura-toggle-icon');
        
        if (tabla.style.display === 'none' || tabla.style.display === '') {
            tabla.style.display = 'table';
            icono.style.transform = 'rotate(90deg)';
        } else {
            tabla.style.display = 'none';
            icono.style.transform = 'rotate(0deg)';
        }
    };
}

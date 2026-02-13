# Diagrama de Flujo: Cierre de Caja

## Flujo Actual (Problemático)
```mermaid
graph TD
    A[Usuario abre modal] --> B[Ingresa dinero inicial]
    B --> C[Hace clic 'Calcular Cierre']
    C --> D[POST /api/close-register-preview]
    D --> E[Sistema calcula y devuelve preview]
    E --> F[Usuario ve resultados]
    F --> G{¿Correcto?}
    G -->|Sí| H[Hace clic 'Confirmar Cierre']
    G -->|No| I[Volver a calcular]
    I --> C
    H --> J[POST /api/close-register-confirm]
    J --> K[Sistema guarda cierre]
    K --> L[Éxito]

    style D fill:#ffcccc
    style J fill:#ffcccc
    style E fill:#ffffcc
    style K fill:#ffffcc
```

**Problemas del flujo actual:**
- 🔴 Dos endpoints separados
- 🔴 Estado temporal en frontend
- 🔴 Riesgo de pérdida de datos
- 🔴 Mayor complejidad

## Flujo Propuesto (Simplificado)
```mermaid
graph TD
    A[Usuario abre modal] --> B[Ingresa dinero inicial]
    B --> C[Hace clic 'Cerrar Caja']
    C --> D[POST /api/close-register]
    D --> E[Sistema valida + calcula + guarda]
    E --> F[Éxito]

    style D fill:#ccffcc
    style E fill:#ccffcc
```

**Beneficios del flujo simplificado:**
- ✅ Un solo endpoint
- ✅ Transacción atómica
- ✅ Menos código
- ✅ Mejor UX
- ✅ Más confiable

## Validaciones del Nuevo Endpoint
```mermaid
graph TD
    A[Recibir request] --> B[Validar entrada]
    B --> C[Verificar permisos]
    C --> D[¿Ya existe cierre para fecha/hora?]
    D -->|Sí| E[Error: Cierre duplicado]
    D -->|No| F[Calcular totales de ventas]
    F --> G[Crear registro de cierre]
    G --> H[Confirmar transacción]
    H --> I[Devolver éxito]

    style E fill:#ffcccc
    style I fill:#ccffcc
```

¿Te gusta esta simplificación? Elimina la complejidad innecesaria y hace el proceso mucho más robusto.
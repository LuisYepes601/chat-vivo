# Aplicación de Chat en Tiempo Real con Socket.IO y Node.js

## Descripción del Proyecto
Esta aplicación corresponde a la Actividad Individual Libre de la Unidad 4. Implementa un chat en tiempo real con arquitectura cliente-servidor utilizando Node.js, Express y Socket.IO para comunicación bidireccional basada en eventos sin recarga de página.

## Características Destacadas
- **Comunicación en Tiempo Real**: Envío y recepción de mensajes instantáneos.
- **Lista de Usuarios Activos**: Sincronización dinámica de los usuarios conectados.
- **Indicador de Tipeo**: Muestra en tiempo real cuando un participante escribe.
- **Notificaciones del Sistema**: Mensajes cuando un usuario entra o sale de la sala.
- **Interfaz Moderna Responsive**: Diseño Dark Mode optimizado.

## Tabla de Eventos de Socket.IO Implementados
| Evento | Dirección | Descripción |
| :--- | :--- | :--- |
| `user:join` | Cliente -> Servidor | Registra el nombre del usuario al conectar. |
| `users:update` | Servidor -> Cliente | Transmite la lista actualizada de usuarios conectados. |
| `chat:message` | Bidireccional | Envía y distribuye los mensajes del chat. |
| `chat:typing` | Bidireccional | Notifica el estado de escritura de un usuario. |
| `chat:notification`| Servidor -> Cliente | Informa sobre uniones y desconexiones de la sala. |

## Instrucciones para Ejecución Local

1. Clonar o descomprimir los archivos del proyecto.
2. Abrir una terminal en la raíz del proyecto y ejecutar:
   ```bash
   npm install
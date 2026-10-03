import { Module } from '@nestjs/common';
import { EventsController } from './infrastructure/messaging/events.controller';

/**
 * Módulo mínimo del worker consumidor: solo el controlador de eventos.
 * No carga la API HTTP ni la base de datos del dominio; su única
 * responsabilidad es reaccionar a los eventos del broker.
 */
@Module({
  controllers: [EventsController],
})
export class ConsumerModule {}

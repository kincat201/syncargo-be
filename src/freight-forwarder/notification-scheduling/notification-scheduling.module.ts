import { Module } from '@nestjs/common';
import { NotificationsModule } from './../notifications/notifications.module';
import NotificationSchedulingService from './notification-scheduling.service';

@Module({
    imports: [NotificationsModule],
    providers: [NotificationSchedulingService],
    exports: [NotificationSchedulingService],
})
export class NotificationScheduling { }

import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

import { NotificationsService } from './../notifications/notifications.service';

@Injectable()
export default class NotificationSchedulingService {
    constructor(
        private readonly notificationService: NotificationsService,
        private readonly schedulerRegistry: SchedulerRegistry,
    ) { }

  scheduleNotification(name: string, date: string, body: object) {
    const scheduleDate = new Date(date);
    const notification = new CronJob(scheduleDate, async () => {
      this.notificationService.create(body);
    });
    const scheduleName = `reminder-${name}-${scheduleDate.toISOString()}`;
        this.schedulerRegistry.addCronJob(scheduleName, notification);
        notification.start();
    }

    getSchedule(scheduleName) {
        this.schedulerRegistry.getCronJob(scheduleName);
    }

    getAllSchedule() {
        const notifications = this.schedulerRegistry.getCronJobs();
        for (const [key, value] of notifications) {
            let next;
            try {
                next = `Schedule of [${key}] will be fired at ${value
                    .nextDates()
                    .toLocal()}`;
            } catch (err) {
                next = 'Error: This notification has been fired in the past';
            }
            console.log(`Notification: ${key} will be fired at ${next}`);
        }
    }

    stopSchedule(scheduleName) {
        this.schedulerRegistry.deleteCronJob(scheduleName);
    }
}

import { delay, logError } from '@warden/utils';
import { Connection, connect } from 'amqplib';
import { isFatalError } from 'amqplib/lib/connection';
import { EventEmitter } from 'events';

export interface IConnectionConfig {
  connectionString: string;
  maxReconnectAttempts: number;
  reconnectMsec: number;
}

export class ConnectionManager extends EventEmitter {
  private static instance: ConnectionManager;
  private connection: Connection | null = null;
  private connectionPromise: Promise<Connection> | null = null;
  private connectAttempts: number = 0;
  private errorEventAttempts: number = 0;
  private lastErrorEventTime: number = 0;
  private readonly ERROR_EVENT_RESET_PERIOD_MS = 5 * 60 * 1000; // 5 minutes
  private isShuttingDown: boolean = false;

  private constructor(private config: IConnectionConfig) {
    super();
    this.setupSignalHandlers();
  }

  private setupSignalHandlers(): void {
    const gracefulShutdown = async (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      logError(`Received ${signal}. Closing connection...`);
      if (this.connection) {
        try {
          await this.connection.close();
        } catch (error) {
          logError(`Error while closing connection: ${error}`);
        }
      }
      process.exit(0);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  }

  static getInstance(config: IConnectionConfig): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager(config);
    }
    return ConnectionManager.instance;
  }

  private async attemptReconnect(isErrorEvent: boolean = false): Promise<void> {
    if (this.isShuttingDown) return;

    const attempts = isErrorEvent ? this.errorEventAttempts : this.connectAttempts;

    if (attempts >= this.config.maxReconnectAttempts) {
      logError(
        `Max broker reconnection attempts reached (${isErrorEvent ? 'error event' : 'connection'} attempts). Exiting...`,
      );
      process.exit(1);
    }

    if (isErrorEvent) {
      this.errorEventAttempts++;
      logError(
        `Attempting to reconnect after error event (attempt ${this.errorEventAttempts}/${this.config.maxReconnectAttempts})...`,
      );
    } else {
      this.connectAttempts++;
      logError(`Attempting to reconnect (attempt ${this.connectAttempts}/${this.config.maxReconnectAttempts})...`);
    }

    await delay(this.config.reconnectMsec);
    await this.initConnection();
  }

  private resetErrorEventCounter(): void {
    const now = Date.now();
    if (now - this.lastErrorEventTime > this.ERROR_EVENT_RESET_PERIOD_MS) {
      this.errorEventAttempts = 0;
      this.lastErrorEventTime = now;
    }
  }

  async getConnection(): Promise<Connection> {
    if (this.connection) {
      return this.connection;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.initConnection();
    return this.connectionPromise;
  }

  private async initConnection(): Promise<Connection> {
    try {
      const connection = await connect(this.config.connectionString);

      connection.once('error', async (error) => {
        logError(`connection emitted 'error': ${error}`);
        // 'close' will also be emitted, after 'error'
      });

      connection.once('close', async (error) => {
        logError(`connection emitted 'close': ${error}`);
        if (isFatalError(error)) {
          process.exit(1);
        }
        this.connection = null;
        this.connectionPromise = null;
        this.lastErrorEventTime = Date.now();
        this.emit('connectionClosed');
        await this.attemptReconnect(true);
      });

      this.connection = connection;
      this.connectAttempts = 0;
      this.resetErrorEventCounter();
      this.emit('connectionEstablished', connection);
      return connection;
    } catch (error) {
      logError(error);
      this.connectionPromise = null;
      await this.attemptReconnect(false);
      throw error;
    }
  }
}

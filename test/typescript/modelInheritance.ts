import { Model } from 'mongoose';

class InteractsWithDatabase extends Model {
  async _update(): Promise<void> {
    await this.save();
  }
}

class SourceProvider extends InteractsWithDatabase {
  static async deleteInstallation (installationId: number): Promise<void> {
    await this.findOneAndDelete({ installationId });
  }
}
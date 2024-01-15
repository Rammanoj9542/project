const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('./server'); // Replace with the path to your Express app
const fs = require('fs').promises;

chai.use(chaiHttp);
const expect = chai.expect;

describe('Upload Audio Route', () => {
  for (let i = 1; i <= 10; i++) {
    it('should upload audio asynchronously', async () => {
      const testUser = { username: 'testuser' };
      // Simulate user session
      app.use((req, res, next) => {
        req.session = testUser;
        next();
      });

      // Simulate the sessionTimestamps
      const sessionTimestamps = { 'testuser': '123456789' };

      app.set('sessionTimestamps', sessionTimestamps);

      // Create a temporary audio file for testing
      const tempAudioPath = 'C:\\Users\\DELL\\Skill-Practice-App\\data\\user\\user_1697384475_Question1.mp3';
      console.log("Entering Uploading")
      await fs.writeFile(tempAudioPath, 'Test audio content');

      const response = await chai.request(app)
        .post('/upload-audio')
        .attach('audio', await fs.readFile(tempAudioPath), 'test_audio.mp3') // Use fs.promises.readFile

      expect(response).to.have.status(200);
    });
  }
});

describe('Upload Video Route', () => {
  for (let i = 1; i <= 10; i++) {
    it('should upload video asynchronously', async () => {
      const testUser = { username: 'testuser' };
      // Simulate user session
      app.use((req, res, next) => {
        req.session = testUser;
        next();
      });

      // Simulate the sessionTimestamps
      const sessionTimestamps = { 'testuser': '123456789' };

      app.set('sessionTimestamps', sessionTimestamps);

      // Create a temporary audio file for testing
      const tempAudioPath = 'C:\\Users\\DELL\\Skill-Practice-App\\data\\user\\user_1697384613_Question1.mp4';
      console.log("Entering Uploading")
      await fs.writeFile(tempAudioPath, 'Test video content');

      const response = await chai.request(app)
        .post('/upload')
        .attach('video', await fs.readFile(tempAudioPath), 'test_audio.mp4') // Use fs.promises.readFile

      expect(response).to.have.status(200);
    });
  }
});
/*
Notes:
Assume this file is in ~/polly folder

Install required NPM modules
cd ~/polly
npm install

Install mpg123 (apt-get install mpg123) for the mp3 to wav conversion

in /etc/snips.toml, change TTS config to contain following 3 lines
[snips-tts]
provider = "customtts"
customtts = { command = ["node /home/pi/polly/polly-tts.js", "-w", "%%OUTPUT_FILE%%", "-l", "%%LANG%%", "%%TEXT%%"] }

Set the AWS key and secret values below as well as the region

Script is called as 'node /home/pi/polly/polly-tts.js "-w" "/tmp/.tmpbQHj3W.wav" "-l" "en" "For how long?"'
*/

// AWS parameters
const awsParams = {
  accessKeyId: '', //AWSKEY
  secretAccessKey: '', //AWSSECRET,
  apiVersion: '2016-06-10'
};

const AWS_REGION = 'eu-central-1'; // See: https://docs.aws.amazon.com/general/latest/gr/rande.html

// Polly TTS parameters
const SSML = false;

let ttsParams = {
  OutputFormat: 'mp3',
  SampleRate: '22050',
  Text: '', // set later
  TextType: SSML ? 'ssml' : 'text',
  VoiceId: 'Salli'
};

// Other parameters
const CACHE_DIR = '/home/pi/polly/cache'; // location to keep the cached MP3 files
// If CACHE_FILE true, this will store all NEW mp3s with the text in a seperate
// file, e.g <hash.mp3>,<spoken text> for reference purposes
const CACHE_FILE = false;

// Required modules
const aws = require('aws-sdk');
const fs = require('fs');
const md5 = require('crypto-js').MD5;
const mkdirp = require('mkdirp');
const path = require('path');
const pathExists = require('path-exists');
const util = require('util');
//const exec = util.promisify(require('child_process').exec); // for mpg123 conversion
var exec = require('child_process').exec;

// AWS config
aws.config.update({
  region: AWS_REGION
});

// Return md5 hash of the string and use as filename, based on parameters as well
function getFilename(text) {
  var ssmlText = SSML ? '_ssml' : '';
  var hashString = ttsParams.VoiceId + '_' + ttsParams.OutputFormat + "_";
  hashString += ttsParams.SampleRate + ssmlText + '_' + text;
  console.log(hashString);
  hash = md5(hashString);
  return hash;
};

// create caching directory if needed
function setupDirectory(aPath) {
  try {
    return fs.statSync(aPath).isDirectory();
  } catch (e) {
    // Path does not exist
    if (e.code === 'ENOENT') {
      // Try and create it
      try {
        mkdirp.sync(aPath);
        console.log('Created directory path: ' + aPath);
        return true;
      } catch (e) {
        console.log('Error: failed to create path: ' + aPath);
      }
    }
    // Otherwise failure
    return false;
  }
};

// Synthsize speech
function synthesizeSpeech(params) {
  return new Promise((resolve, reject) => {
    let polly = new aws.Polly(awsParams);
    polly.synthesizeSpeech(params, function(err, data) {
      if (err !== null) {
        console.log('ERROR: polly had an error');
        return reject(err);
      } else {
        console.log('INFO: Polly is done');
        resolve(data);
      }
    });
  });
};

function cacheSpeech(filename, data) {
  console.log('INFO: Caching ' + data.length + ' into ' + filename);
  return new Promise((resolve, reject) => {
    fs.writeFileSync(filename, data, (err) => {
      console.log(err);
      if (err) {
        console.log('ERROR: caching ' + err);
        reject(err);
      } else {
        console.log('INFO: Caching done to ' + filename + ', written ' + data.length + ' bytes');
        resolve(filename);
      }
    });
  });
}


// Copy wave fle to correct dir
function copyFile(src, trg) {
  return new Promise((resolve, reject) => {
    fs.copyFile(src, trg, function(err) {
      if (err) {
        console.log('ERROR: caching ' + err);
        reject(err)
      } else {
        console.log('INFO: ' + src + ' was copied to ' + trg);
        resolve(trg);
      }
    });
  });
}

function convertToWav(basefile) {
  return new Promise((resolve, reject) => {
    let filename = CACHE_DIR + '/' + basefile;
    let cmd = 'mpg123 -w ' + filename + '.wav ' + filename + '.mp3'
    console.log('INFO: executing ' + cmd);
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        reject(err);
      }
      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);
      resolve([stdout, stderr]);
    });
  });
}

// main function - passed params from snips
//console.log(process.argv);
var text = process.argv[6];
var targetFile = process.argv[3];
// check cache dir
if (!setupDirectory(CACHE_DIR)) {
  console.log('Unable to set up cache directory: ' + CACHE_DIR);
  return;
}

// get base filename
var basefile = getFilename(text);
var cachedWav = CACHE_DIR + '/' + basefile + '.wav';
console.log('INFO: checking for cached file ' + cachedWav);
// is this file still cached?
pathExists(cachedWav)
  .then(cached => {
    if (cached) {
      console.log('Using cached file ' + cachedWav);
      // copy cached file to expected target
      copyFile(cachedWav, targetFile).then(result => {
        process.exit(0);
      });
    } else {
      console.log('No cached file, create new');
      // not cached, make new
      var started = Date.now();
      var cachedMp3 = CACHE_DIR + '/' + basefile + '.mp3';
      ttsParams.Text = text;
      synthesizeSpeech(ttsParams)
        .then(data => {
          console.log('INFO: Received ' + data.AudioStream.length + ' bytes');
          cacheSpeech(cachedMp3, data.AudioStream)
        })
        .then(filename => {
          console.log('INFO: Converting');
          convertToWav(basefile)
        })
        .then(result => {
          console.log('INFO: Copying wav to  ' + targetFile);
          copyFile(cachedWav, targetFile)
        })
        .then(result => {
          console.log('INFO: Exiting');
          process.exit(0);
        })
        .catch(error => {
          console.log('ERROR: ' + error);
          process.exit(error)
        });
    }
  });


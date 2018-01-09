#!/bin/bash
# Shell script to replace TTS in snips with AWS polly
#
# Install and configure aws cli as per https://docs.aws.amazon.com/polly/latest/dg/getting-started-cli.html
# Installed in /home/<user>/.local/bin, configure with aws configure and provide key, secret, etc.
#
# in /etc/snips.toml, change TTS config to contain following 3 lines
# [snips-tts]
# provider = "customtts"
# customtts = { command = ["/home/pi/polly.sh", "-w", "%%OUTPUT_FILE%%", "-l", "%%LANG%%", "%%TEXT%%"] }
#
# install mpg123 (apt-get install mpg123) for the mp3->wav conversion
#
# This will run e.g. '"/home/pi/polly.sh" "-w" "/tmp/.tmpbQHj3W.wav" "-l" "en" "For how long?"'
# 
# Input text and parameters will be used to calculate a hash for caching the mp3 files so only
# "new speech" will call polly, existing mp3s will be transformed in wav files directly

# Folder to cache the files
cache="/home/pi/cache/"

# Voice to use
voice="Salli"

# format to use
format="mp3"

# Sample rate to use
samplerate="22050"

# passed text string
text="$5"
echo 'Input text:' $text

# target file to return to snips-tts (wav)
outfile="$2"
echo 'Output file:' $outfile 

# check/create cache if needed
mkdir -pv "$cache"

# create hash for the string based on params and text
md5string="$text""_""$voice""_""$format""_""$samplerate"
echo 'Using string for hash': $md5string

hash="$(echo -n "$md5string" | md5sum | sed 's/ .*$//')"
echo 'Calculated hash:' $hash

cachefile="$cache""$hash".mp3
echo 'Cache file:' $cachefile 

# do we have this?
if [ -f "$cachefile" ]
then
	echo "$cachefile found."
    # convert
    mpg123 -w "$outfile" "$cachefile"
else
	echo "$cachefile not found, running polly"
    # execute polly to get mp3 - check paths, voice set to Salli
    /home/pi/.local/bin/aws polly synthesize-speech --output-format "$format" --voice-id "$voice" --sample-rate "$samplerate" --text "$text" "$cachefile"
    # execute conversion to wav
    mpg123 -w $outfile $cachefile
fi



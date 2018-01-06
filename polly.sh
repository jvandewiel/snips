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
# install avconv (apt-get install libav-tools) for the mp3->wav conversion
#
# This will run e.g. '"/home/pi/polly.sh" "-w" "/tmp/.tmpbQHj3W.wav" "-l" "en" "For how long?"'
#
output_file="$2"
textstr="$5"
# get interm filename
interm_file="$(basename "$output_file" .wav).mp3"
# debugging
#echo 'Calling polly for output file:' $output_file 
#echo 'and intermediate file:' $interm_file 
#echo 'Input text:' $textstr
# execute polly to get mp3 - check paths, voice set to Salli
/home/pi/.local/bin/aws polly synthesize-speech --output-format mp3 --voice-id Salli --sample-rate 16000 --text "$textstr" $interm_file
# execute conversion to wav
avconv -y -i $interm_file $output_file

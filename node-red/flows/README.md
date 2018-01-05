# Collection of exported node-red flows, used in combination with Snips, Openhab etc.

## Files
```Hermes-protocol.json```: contains various MQTT messages that are created as part of the Snips AI processing (see also [hermes protocol](https://github.com/snipsco/snips-platform-documentation/wiki/6.--Miscellaneous#hermes-protocol))

```snips-jokes.json```: contains a flow to handle a joke intents; also contains generic intent parser (subflow) and Polly TTS (AWS Polly TTS). Polly config and AWS Polly API access (key) is a pre-requisite.

```spotify-setup.json```: contains flow for key/auth handlilng of Spotify; requires (1) premium account and (2) API key and (3) config item with right global clientid/secret settings. Run through steps 1..4 and use spotifyApi in other flows to interact with Spotify



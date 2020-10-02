# coc-react-native

React Native support for (neo)vim. The plan is to iteratively add features that are in [react-native-tools](https://github.com/Microsoft/vscode-react-native); the list below is a vague feature list in order of prioritisation (which will probably change).

Disclaimer: I've never written a coc plugin before - I'm a React Native / TS / JS developer, and use vim (with coc) daily. I'm basically learning as I go. I just realised that there was no equivalent to react-native-tools for vim, so I'm scratching my own itch and doing it myself.

## Features

- Start packager
- Show dev menu
- Toggle debug mode
- Toggle inspector
- Toggle performance monitor
- Reload JS
- Possibly add in some Reactotron features, e.g storybook toggle
- Debugger support (perhaps vimspector)
- Screenshotting, record video

## Install

WIP, not yet live on coc.

## Commands

Open React Native only commands list: `CocList --input=rn commands`

### Global Commands:
- `rn.start`: (re)Start React Native packager.

**Coming soon**
Note: none of these exist yet. All are very likely to change/be removed.

- `rn.ios`: Build and run app for iOS
- `rn.android`: Build and run app for Android
- `rn.emulators`: List Android emulators

### Dev Server Commands:
- `rn.dev.stop` Quit server

**Coming soon**
> available when dev server running

- `rn.dev.debug`: Toggle debug mode
- `rn.dev.reload`: Reload JS
- `rn.dev.inspector`: Toggle inspector
- `rn.dev.perfMonitor`: Toggle the performance monitor
- `rn.dev.hotReload` Hot reload
- `rn.dev.hotRestart` Hot restart
- `rn.dev.screenshot` To take a screenshot

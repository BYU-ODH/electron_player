
module.exports = {
  player : {
    video_obj: document.getElementById('player'),
    annotations: null,
    json_file_path: null,
    current_time: 0, // While reloading the JSON, what is the current time of the player
    paused: false, // While reloading the JSON, is the player paused or playing

    button_press: () => {
      const files = player.get_selected_files()
      if (!files){
        document.getElementById('filePicker').click()
        document.getElementById('filePicker').onchange = function() {
          document.getElementById('files').innerHTML = player.get_selected_files().videoFile.name
          document.getElementById('playButton').classList.add('ready')
          document.getElementById('filePicker').onchange = null
        }
      } else {
        player.start_player()
      }
    },

    start_player: () => {
      const files = player.get_selected_files()

      if (!files){
        alert("Error: The selected folder does not contain an *.icf file. Please try again.")
        return
      }

      // Instantiate object variable 'annotations'
      player.parse_n_play(files['jsonFile'], player.initialise_callback)
    },

    hide_player: () => {
      // Show Splash Screen
      let splashScreen = document.getElementById('splashScreen')
      splashScreen.style.visibility = "visible"

      // Hide Player
      let playerContainer = document.getElementById('playerContainer')
      playerContainer.style.visibility = "hidden"
      document.getElementById('playButton').classList.remove('ready')

      // Pause the video
      player.video_obj.pause()

      // Set background to normal
      document.body.style.background = 'linear-gradient(to right, #1e425e, #839aa8, #1e425e)'

      //Clear selected files
      document.getElementById('filePicker').value = ''
      console.log(document.getElementById('filePicker').files)
      document.getElementById('files').innerHTML = "Select Files"
    },

    reload_json: () => {
      console.log("Reloading JSON")
      player.current_time = player.video_obj.currentTime
      player.paused = player.video_obj.paused

      Events.removeListener(player.video_obj, "playing", (event) => {
        return
      })

      if(player.video_obj.classList.contains('blanked')) {
        player.unblank()
      }
      if(player.video_obj.classList.contains('blurred')) {
        player.unblur()
      }
      for(var i = 0; i < player.annotations.length; i++) {
        if(player.annotations[i].type == 'censor') {
          var censor = document.getElementById('censor' + i)
          if(censor) {
            censor.parentNode.removeChild(censor)
          }
        }
      }
      player.unmute()
      var fileData = fs.readFileSync(player.json_file_path)
      player.initialise_callback(fileData)
    },

    get_selected_files: () => {
      var fileList = document.getElementById('filePicker').files,
          jsonFile = null,
          icfFile = null,
          videoFile = null,
          jsonFileExists = false,
          icfFileExists = false,
          videoFileExists = false

      for(var i=0; i < fileList.length; i++){
        var ext = fileList[i]["name"].split(".")[1]
        if (ext === "json"){
          jsonFileExists = true
          jsonFile = fileList[i]
        }
        else if (ext === "icf"){
          icfFileExists = true
          icfFile = fileList[i]
        }
        else if (ext === "mp4" || ext === "m4v") {  /*TODO: Add all supported file types*/
          videoFileExists = true
          videoFile = fileList[i]
        }
      }

      if(icfFileExists && (!jsonFileExists || !videoFileExists)) {
        //{"subtitle": null, "video": "KungFuPandamv_IC.m4v", "annotation": "KungFuPandamv_IC.json"}
        /*fs.readFile(icfFile['path'], (err, fileData) => {
          if(err) {
            return err;
          }
          var jsonObj = JSON.parse(fileData)
          console.log(jsonObj)
          var jsonPath = icfFile['path'].replace(/\/[^\/]*$/, '/'+ jsonObj['annotation'])
          var videoPath = icfFile['path'].replace(/\/[^\/]*$/, '/'+ jsonObj['video'])

          fs.readFile(jsonPath, (err, fileData) => {
            if(err) {
              return err;
            }
            jsonFile = new File(fileData, jsonPath)
            jsonFileExists = true
          })
          fs.readFile(videoPath, (err, fileData) => {
            if(err) {
              return err;
            }
            videoFile = new File(fileData, jsonPath)
            videoFileExists = true
          })
        })*/
        const icfData = fs.readFileSync(icfFile['path'])
        const icfObj = JSON.parse(icfData)
        console.log(icfObj)
        const jsonPath = icfFile['path'].replace(/\/[^\/]*$/, '/'+ icfObj['annotation'])
        const videoPath = icfFile['path'].replace(/\/[^\/]*$/, '/'+ icfObj['video'])
        const jsonData = fs.readFileSync(jsonPath)
        jsonFile = new File(jsonData, jsonPath)
        //jsonFileExists = true
        const videoData = fs.readFileSync(videoPath)
        videoFile = new File(videoData, jsonPath)
        //videoFileExists = true
      }

      // if all the necessary files are included, return the fileList; else return FALSE
      return (jsonFile && videoFile)
        ? {'jsonFile': jsonFile, 'icfFile': icfFile, 'videoFile': videoFile}
        : false
    },

    get_video_dimensions: () => {
      var video = player.video_obj

      // Ratio of the video's intrisic dimensions
      var videoRatio = video.videoWidth / video.videoHeight

      // The width and height of the video element
      var width = video.offsetWidth
      var height = video.offsetHeight

      // The ratio of the element's width to its height
      var elementRatio = width/height

      // If the video element is short and wide
      if(elementRatio > videoRatio) width = height * videoRatio;

      // It must be tall and thin, or exactly equal to the original ratio
      else height = width / videoRatio
      return {
        width: width,
        height: height
      }
    },

    draw_box: () => {
      var videoDimensions = player.get_video_dimensions()
      var vidHeight = videoDimensions.height
      var vidWidth = videoDimensions.width

      // Get window Height
      var winHeight = window.innerHeight
      var winWidth = window.innerWidth

      var boxTop = 0
      var boxLeft = 0
      if(winHeight > vidHeight)
        boxTop = (winHeight - vidHeight) / 2
      else
        boxLeft = (winWidth - vidWidth) / 2

      var box = document.getElementById('box')

      box.style.top = `${boxTop}px`
      box.style.left = `${boxLeft}px`

      box.style.height = `${vidHeight}px`
      box.style.width = `${vidWidth}px`
    },

    parse_n_play: (jsonFile, initialise_callback) => {
      player.json_file_path = jsonFile['path']
      fs.readFile(jsonFile['path'], (err, fileData) => {
        if(err) {
          return err;
        }
        initialise_callback(fileData)
      })
    },

    initialise_callback: (fileData) => {
      console.log("initialising")
      player.annotations = []
      var jsonObj = JSON.parse(fileData)
      if (jsonObj["media"]) {
        var jsonGuts = jsonObj["media"][0]["tracks"][0]["trackEvents"]
      } else {
        var jsonGuts = jsonObj
      }
      for (var i = 0; i < jsonGuts.length; i++) {
        if (jsonObj["media"]) {
          var annotation = {"start": jsonGuts[i].popcornOptions['start'],
                            "end": jsonGuts[i].popcornOptions['end'],
                            "details": jsonGuts[i].popcornOptions['details'],
                            "type": jsonGuts[i]['type']
                           }
        } else {
          var annotation = {"start": jsonGuts[i].options['start'],
                            "end": jsonGuts[i].options['end'],
                            "type": jsonGuts[i].options['type'],
                            "details": jsonGuts[i].options['details']
                           }
        }
        player.annotations.push(annotation)
      }
      player.annotate()

      // Hide Splash Screen
      let splashScreen = document.getElementById('splashScreen')
      splashScreen.style.visibility = "hidden"

      const files = player.get_selected_files()

      // Set video src to given file
      let videoPath = files['videoFile']['path']
      player.video_obj.src = videoPath

      // Show Player
      let playerContainer = document.getElementById('playerContainer')
      playerContainer.style.visibility = "visible"

      // Show Reload JSON button
      if(!annotateMode) {
        let reloadJsonBtn = document.getElementById('reloadJsonBtn')
        reloadJsonBtn.style.visibility = "hidden"
      }

      // Hide Splash Screen
      let splashScreenContainer = document.getElementById('splashScreen')
      splashScreenContainer.style.visibility = "hidden"

      // Set background to black
      document.body.style.background = 'black'

      // Play the video
      if(!player.paused) {
        player.video_obj.play()
      }

      console.log(player.annotations)

      player.censors = []
      for (var i = 0; i < player.annotations.length; i++) {
        if (player.annotations[i].type == 'censor') {
          var censor = []
          censor[0] = player.annotations[i].start
          censor[1] = player.annotations[i].end
          censor[2] = []
          Object.entries(player.annotations[i].details.position).forEach(([key, val]) => {
            censor[2].push([key, val[0], val[1]])
          })
          player.censors.push(censor)
        }
      }

      Events.addListener(player.video_obj, "loadedmetadata", ()=> {
        // Draw box initially
        player.draw_box()
        player.video_obj.currentTime = player.current_time
      })
    },

    annotate: () => {
      console.log("in the annotate function")
      var currently = {'muting': -1, 'blanking': -1, 'blurring': -1}
      Events.addListener(player.video_obj, "playing", (event) => {
        onFrameAdv()
        function onFrameAdv() {
          if (player.video_obj.paused) {
            return
          }
          var time = player.video_obj.currentTime

          var numAnnotations = player.annotations.length
          for (var i = 0; i < numAnnotations; i++) {
            var vMuted = player.video_obj.muted
            var vBlanked = player.video_obj.classList.contains('blanked')
            var vBlurred = player.video_obj.classList.contains('blurred')

            var a = player.annotations[i]
            var aStart = a['start']
            var aEnd = a['end']
            var aType = a['type']
            var aDetails = a['details']

            switch (a['type']) {
              case 'skip':
                if (time >= aStart && time < aEnd) {
                  console.log('skipped to '+Number(aEnd).toFixed(3))
                  player.skip_to(aEnd)
                }
                break
              case 'mute':
              case 'mutePlugin':
                if (currently.muting === -1 || currently.muting === i) { //if no annotation is currently muting or *this* current annotaiton is muting
                  if (time >= aStart && time < aEnd) { //if within annotation time
                    if (!vMuted) {
                      console.log('mute on')
                      currently.muting = i
                      player.mute()
                    }
                  } else {
                    if (vMuted) {
                      console.log('mute off')
                      currently.muting = -1
                      player.unmute()
                    }
                  }
                }
                break
              case 'blank':
                if (currently.blanking === -1 || currently.blanking === i) {
                  if (time >= aStart && time < aEnd) {
                    if (!vBlanked) {
                      console.log('blank on')
                      currently.blanking = i
                      player.blank()
                    }
                  } else {
                    if (vBlanked) {
                      console.log('blank off')
                      currently.blanking = -1
                      player.unblank()
                    }
                  }
                }
                break
              case 'blur':
                if (currently.blurring == -1 || currently.blurring === i) {
                  if (time >= aStart && time < aEnd) {
                    if (!vBlurred) {
                      console.log('blur on')
                      currently.blurring = i
                      player.blur()
                    }
                  } else {
                    if (vBlurred) {
                      console.log('blur off')
                      currently.blurring = -1
                      player.unblur()
                    }
                  }
                }
                break
              case 'censor':
                if (time >= aStart && time < aEnd) {
                  if (!document.getElementById('censor'+i)) {
                    console.log("censor on")
                    var censor = document.createElement('div')
                    censor.id = 'censor' + i
                    censor.classList.add('censor')
                    censor.classList.add(aDetails['type'])
                    censor.style = `
                      position: absolute;
                      width: ` + aDetails['position'][aStart][2] + `%;
                      height: ` + aDetails['position'][aStart][3] + `%;
                      left: ` + aDetails['position'][aStart][0] + `%;
                      top: ` + aDetails['position'][aStart][1] + `%;` //padding-bottom sets the height relative to the width
                    if (aDetails['type'] == 'black' || aDetails['type'] == 'red') {
                      censor.style['background-color'] = aDetails['type']//'black'
                    } else if (aDetails['type'] == 'blur') {
                      censor.style['backdrop-filter'] = 'blur(' + aDetails['amount'] + ')'
                    }
                    if(annotateMode) {
                      censor.classList.add('censor-annotate')
                      /*Events.addListener(censor, 'click', () => {
                        console.log(this)
                        censor.style['background'] = `#4c88ff`
                        censor.style['opacity'] = `0.50`
                        censor.style['resize'] = 'both'

                        const checkKey = (e) => {
                          e = e || window.event;
                          if (e.keyCode == '38') {
                            // Up arrow
                            censor.style['height'] = censor.style['height'] + censor.style['height'] * .005
                            censor.style['top'] = censor.style['top'] - censor.style['height'] * .005
                          }
                          else if (e.keyCode == '40') {
                            // Down arrow
                            censor.style['height'] = censor.style['height'] + censor.style['height'] * .005
                          }
                          else if (e.keyCode == '37') {
                            // Left arrow
                            censor.style['width'] = censor.style['width'] + censor.style['width'] * .005
                            censor.style['left'] = censor.style['left'] - censor.style['width'] * .005
                          }
                          else if (e.keyCode == '39') {
                            // Right arrow
                            censor.style['width'] = censor.style['width'] + censor.style['width'] * .005
                          }
                          else if(e.keyCode == '13') {
                            // Enter key
                            var position = `[` + censor.style['left'] + `,` + censor.style['top'] +
                              `,` + censor.style['width'] + `,` + censor.style['height'] + `]`
                            console.log(position)
                            document.onkeydown = null;
                          }
                        }
                        document.onkeydown = checkKey;
                      })*/
                    }
                    document.getElementById('box').appendChild(censor)
                  } else {
                    for (var j = 0; j < player.censors.length; j++) {
                      annoTime = Object.keys(a.details.position).reduce((prev, curr) => Math.abs(curr - time) < Math.abs(prev - time) ? curr : prev) //closest to current time
                      document.getElementById('censor'+i).style.left = aDetails['position'][annoTime][0]+'%'
                      document.getElementById('censor'+i).style.top = aDetails['position'][annoTime][1]+'%'
                      if (aDetails['position'][annoTime][2] && aDetails['position'][annoTime][3]) {
                        document.getElementById('censor'+i).style.width = aDetails['position'][annoTime][2]+'%'
                        document.getElementById('censor'+i).style.height = aDetails['position'][annoTime][3]+'%'
                      }
                    }
                  }
                } else {
                  if (document.getElementById('censor'+i)) {
                    console.log("censor off")
                    document.getElementById('censor'+i).outerHTML = ''
                  }
                }
                break
            }
          }
          requestAnimationFrame(onFrameAdv)
        }
      })
    },

    // Annotation Handlers

    play: () => { player.video_obj.play() },

    pause: () => { player.video_obj.pause() },

    skip_to: (time) => { player.video_obj.currentTime = time },

    blank: () => {
      player.video_obj.classList.add('blanked')
      var style = document.createElement('style')
      style.id = 'mask'
      style.innerHTML = `
        video.blanked::-webkit-media-controls {
          background-color: black;
        }
        video.blanked::-webkit-media-text-track-container {
          z-index: 1;
        }`
      document.body.appendChild(style)
    },

    unblank: () => {
      player.video_obj.classList.remove('blanked')
      document.getElementById('mask').outerHTML=''
    },

    blur: () => {
      player.video_obj.classList.add('blurred')
      var style = document.createElement('style')
      style.id = 'mask'
      style.innerHTML = `
        video.blurred::-webkit-media-controls {
          backdrop-filter: blur(10px);
        }
        video.blurred::-webkit-media-text-track-container {
          z-index: 23;
        }`
      document.body.appendChild(style)
    },

    unblur: () => {
      player.video_obj.classList.remove('blurred')
      document.getElementById('mask').outerHTML=''
    },

    mute: () => { player.video_obj.muted =  true },

    unmute: () => { player.video_obj.muted = false }

  }
}

import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import CodeMirror from "codemirror";
import "codemirror/mode/go/go";
import "codemirror/keymap/sublime";
import "codemirror/addon/selection/active-line";
import "codemirror/addon/comment/comment";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/darcula.css";

import MuiThemeProvider from "@material-ui/core/styles/MuiThemeProvider";
import makeStyles from "@material-ui/core/styles/makeStyles";
import Toolbar from "@material-ui/core/Toolbar";
import CircularProgress from "@material-ui/core/CircularProgress";
import Fade from "@material-ui/core/Fade";
import Paper from "@material-ui/core/Paper";
import PlayArrow from "@material-ui/icons/PlayArrow";

import Format from "@material-ui/icons/Spellcheck";
import AppBar from "./AppBar";
import Button from "./Button";
import Settings from "./Settings";
import Errors from "./Errors";
import Result from "./Result";
import createTheme from "./createTheme";

const useStyles = makeStyles(theme => ({
  "@global": {
    ".CodeMirror": {
      fontSize: "0.8rem",
    },
    ".cm-s-darcula .lineerror, .cm-s-darcula .lineerror *": {
      background: "#564646",
      color: "#ff4040 !important",
    },
    ".cm-s-default .lineerror, .cm-s-default .lineerror *": {
      background: "#fdd",
      color: "red !important",
    },
  },
  root: {
    fontSize: theme.typography.fontSize,
    background: theme.palette.primary.main,
    border: 0,
    color: "#fff",
  },
  toolbar: {},
  header: {
    display: "flex",
    alignItems: "center",
    color: "#fff",
    flexGrow: 1,
    "& > *": {
      marginRight: theme.spacing(1),
    },
  },
  title: {
    marginRight: theme.spacing(2),
  },
  editor: {
    fontSize: "0.8rem",
  },
  result: {
    position: "relative",
    marginTop: theme.spacing(1),
  },
  resultOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    display: "flex",
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "space-around",
    zIndex: 10,
  },
}));

const errReg = /prog\.go:(\d+):(\d+):(.+)/g;

export default function GoPlayground(props) {
  const {
    title = null,
    code,
    color = "dark",
    server = "https://play.golang.org/",
    hideFormat = false,
    compactButtons = false,
    theme: themeExtend = {},
    readOnly = false,
    toolBarStyle = {},
    settingsIconStyle = {},
    editorHeight = 300,
    resultMaxHeight = null,
  } = props;

  const [theme, setTheme] = useState(createTheme(color, themeExtend));
  const classes = useStyles(theme);
  const [result, setResult] = useState({});
  const [running, setRunning] = useState(false);
  const editor = useRef({});
  const runBtn = useRef();
  useEffect(() => {
    editor.current.cm = CodeMirror(editor.current, {
      value: code,
      mode: "go",
      lineNumbers: true,
      tabSize: 4,
      smartTabs: true,
      autoSave: true,
      indentWithTabs: true,
      styleActiveLine: !readOnly,
      cursorHeight: readOnly ? 0 : 1,
      viewportMargin: Infinity,
      keyMap: "sublime",
      extraKeys: {
        "Cmd-Enter": function() {
          runBtn.current.click();
        },
      },
      theme: theme.palette.type === "light" ? "default" : "darcula",
      readOnly,
    });
    editor.current.cm.setSize(null, editorHeight)
    editor.current.errors = [];
  }, []);

  useEffect(() => {
    editor.current.cm.setOption("theme", theme.palette.type === "light" ? "default" : "darcula");
  }, [theme.palette.type]);

  function onResult(json) {
    setResult(json);
    editor.current.errors.forEach(line => {
      editor.current.cm.removeLineClass(line, "", "lineerror");
    });
    editor.current.errors = [];
    if (json.Errors) {
      let r = errReg.exec(json.Errors);
      while (r) {
        const line = r[1] - 1;
        editor.current.errors.push(line);
        editor.current.cm.addLineClass(line, "", "lineerror");
        r = errReg.exec(json.Errors);
      }
    }
    setRunning(false);
  }

  return (
    <MuiThemeProvider theme={theme}>
      <AppBar position="static" className={classes.root}>
        <Toolbar className={classes.toolbar} style={toolBarStyle}>
          <div className={classes.header}>
            {title && <span className={classes.title}>{title}</span>}
            <Button
              ref={runBtn}
              editor={editor}
              url={server + "compile"}
              icon={<PlayArrow/>}
              onRun={() => setRunning(true)}
              onResult={onResult}
              onError={alert}
              compactButtons={compactButtons}
            >
              Run
            </Button>
            {!hideFormat && <Button
              editor={editor}
              url={server + "fmt"}
              icon={<Format/>}
              onResult={setResult}
              onError={alert}
              compactButtons={compactButtons}
            >
              Format
            </Button>}
          </div>
          <Settings
            theme={theme}
            setTheme={setTheme}
            themeExtend={themeExtend}
            settingsIconStyle={settingsIconStyle}
          />
        </Toolbar>

        <Paper>
          <div className={classes.editor} ref={editor} style={{height: editorHeight}} />
        </Paper>

        <div className={classes.result}>
          <Fade in={running && (!!result.Events || !!result.Errors)} timeout={200}>
            <div className={classes.resultOverlay}><CircularProgress color="secondary"/></div>
          </Fade>
          <Errors errors={result.Errors} loading={running} resultMaxHeight={resultMaxHeight}/>
          <Result events={result.Events} loading={running} resultMaxHeight={resultMaxHeight}/>
        </div>
      </AppBar>
    </MuiThemeProvider>
  );
}

GoPlayground.propTypes = {
  code: PropTypes.string.isRequired,
  style: PropTypes.object,
  color: PropTypes.oneOf(["light", "dark"]),
  theme: PropTypes.object,
  server: PropTypes.string,
  hideFormat: PropTypes.bool,
  compactButtons: PropTypes.bool,
  readOnly: PropTypes.bool,
  resultMaxHeight: PropTypes.number,
  toolBarStyle: PropTypes.object,
  settingsIconStyle: PropTypes.object,

};

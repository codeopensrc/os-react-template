"use strict";

import { hot } from 'react-hot-loader/root';
import React from 'react';
import DOM from 'react-dom';
import {
    BrowserRouter as Router,
    Route,
    Switch,
    Link
} from 'react-router-dom';

import Home from "./Home.jsx"
import About from "./About.jsx"

import "../style/Entry.less"

const Entry = function () {
    return (
        <Router>
            <div id={"component-entry"}>
                <div id={"component-header"}>
                    <Link to={"/"} className={"headerButton"}>Home</Link>
                    <Link to={"/about"} className={"headerButton"}>About</Link>
                </div>

                <Switch>
                    <Route exact path={"/"} component={Home} />
                    <Route path={"/about"} component={About} />
                </Switch>

            </div>
        </Router>
    );
}
export default hot(Entry);

DOM.render(<Entry />, document.getElementById("main"))

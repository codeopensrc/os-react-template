"use strict";

import React from 'react';
import DOM from 'react-dom';
import { api } from "os-npm-util";

// require("../style/Home.less")

class Home extends React.Component {

    constructor(props) {
        super(props)
        this.state = {}
    }

    componentDidMount() {

    }

    serverCall() {
        api.get(`/test`, (res) => {
            if(res.status) {
                // Do something
            }
            else {
                // Handle error
            }
        })
    }


    render() {

        return (
            <div>
                <h3>Home</h3>
                Congratulations! This is the default "Home.jsx" landing page.
                <br />
                This is the page/component that loads when no other URL path is specified.
                <br />
                Click the "About" navigation button to head to the example "About.jsx" Page.
            </div>
        );
    }

}

module.exports = Home

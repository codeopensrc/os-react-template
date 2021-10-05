"use strict";

import React from 'react';

// import "../style/About.less"

class About extends React.Component {

    constructor(props) {
        super(props)
        this.state = {}
    }

    componentDidMount() { }

    render() {

        return (
            <div>
                <h3>About</h3>
                Congratulations! This is the example "About.jsx" page at "/about".
            </div>
        );
    }

}

export { About as default };

"use strict";

import React from 'react';

// import "../style/Home.less"

//This default value found in .env.tmpl - see env_file in docker-compose.yml
const SAMPLE_SECRET_KEY = "SAMPLE_SECRET_ENV_VAR"

class Home extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
            items: [],
            sampleVal: "",
            sampleKey: "",
            currentKey: SAMPLE_SECRET_KEY,
            keyDisplay: false
        }
    }

    componentDidMount() {
        console.log("Component mounted")
        console.log("componentDidMount does not rerun on hot reload")
        this.mySampleTest()
        this.mySampleGet()
    } 

    mySampleTest() {
        console.log("Sending sampletest req")
        fetch("/api/get/sampletest").then((r) => r.json()).then((res) => {
            console.log(`sampletest response from server - ${res}`)
        })
    }

    mySampleGet() {
        console.log("Sending mongoquery req")
        fetch("/api/get/mongoquery").then((r) => r.json()).then((res) => {
            console.log("mongoquery response from server -", res)
            if(Array.isArray(res)) {
                this.setState({items: res})
            }
        })
    }

    mySamplePost() {
        console.log("Sending mongoupdate req")
        let jsonbody = {
            secretKey: this.state.currentKey,
            doc: { todoitem: this.state.sampleVal }
        }
        let req = {
            method: "POST",
            body: JSON.stringify(jsonbody),
            headers: {
                'Content-Type': 'application/json'
            }
        }
        fetch("/api/post/mongoupdate", req).then((r) => r.json()).then((res) => {
            console.log("mongoupdate response from server -", res)
            if(res.authorized === false) {
                return this.setState({incorrectCredentials: true})
            }
            this.setState({sampleVal: "", incorrectCredentials: false})
            this.mySampleGet()
        })
    }

    mySampleDelete(id) {
        console.log("Sending mongodelete req")
        let jsonbody = {
            secretKey: this.state.currentKey,
            doc: { id: id }
        }
        let req = {
            method: "DELETE",
            body: JSON.stringify(jsonbody),
            headers: {
                'Content-Type': 'application/json'
            }
        }
        fetch("/api/delete/mongodelete", req).then((r) => r.json()).then((res) => {
            console.log("mongodelete response from server -", res)
            if(res.authorized === false) {
                return this.setState({incorrectCredentials: true})
            }
            this.setState({incorrectCredentials: false})
            this.mySampleGet()
        })
    }

    setKeyToSend() {
        if(this.state.sampleKey == "") { return }
        this.setState({sampleKey: "", currentKey: this.state.sampleKey})
    }

    updateSampleKey(e) {
        this.setState({sampleKey: e.target.value})
    }

    updateSampleInput(e) {
        this.setState({sampleVal: e.target.value})
    }

    render() {

        let items = this.state.items.map((item, ind) => {
            return (
                <div id={item._id} key={ind} style={{display: "flex", border: "1px solid black", marginTop: "2px", maxWidth: "40%"}}>
                    <button onClick={this.mySampleDelete.bind(this, item._id)}> Delete </button>
                    <span style={{width: "10px"}}></span>
                    <div> {item.todoitem} </div>
                </div>
            )
        })

        let incorrectCredentialsDisplay = (
            <div style={{color: "red", fontSize: "20px"}}>Incorrect Key Provided</div>
        )

        return (
            <div>
                <h3>Home</h3>
                Congratulations! This is the default "Home.jsx" landing page.
                <br />
                This is the page/component that loads when no other URL path is specified.
                <br />
                Click the "About" navigation button to head to the example "About.jsx" Page.
                <br />
                <br />
                Below you can find a sample Create, Read, and Delete example that uses MongoDB.
                <br />
                Check the console and review it with the "Home.jsx" file to find out whats happening.
                <br />
                <br />
                {this.state.incorrectCredentials ? incorrectCredentialsDisplay : null}
                <input type={this.state.keyDisplay ? "text" : "password"}
                    placeholder={`Key: ${this.state.keyDisplay ? this.state.currentKey : "*****"}`}
                    value={this.state.sampleKey} onChange={this.updateSampleKey.bind(this)}
                />
                <span id={"togglePass"} className={this.state.keyDisplay ? "vis" : "vis-off"}
                    onClick={() => this.setState({keyDisplay: !this.state.keyDisplay}) }>
                </span>
                <button onClick={this.setKeyToSend.bind(this)}>Set Key</button>
                <br />
                <br />
                <input type={"text"} placeholder={"Text.."} value={this.state.sampleVal} onChange={this.updateSampleInput.bind(this)}/>
                <span style={{display: "inline-block", width: "10px"}}></span>
                <button onClick={this.mySamplePost.bind(this)}>Send POST</button>
                <br />
                <br />
                <button onClick={this.mySampleGet.bind(this)}>Send GET</button>
                <br />
                <br />
                {items} 
            </div>
        );
    }

}

export { Home as default };

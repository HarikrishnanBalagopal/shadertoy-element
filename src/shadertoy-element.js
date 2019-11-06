import {LitElement, html, css} from 'lit-element';

const cout = console.log.bind(console);

function createShader(gl, type, source)
{
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if(success)return shader;

    cout('Failed to compile the shader:', type);
    cout(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader)
{
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if(success)return program;

    cout('Failed to compile the shader program.');
    cout(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

export class ShadertoyElement extends LitElement
{
    static get styles()
    {
        return css`
        :host
        {
            display: inline-block; 
            width: 256px;
            height: 256px;
        }
        canvas
        {
            width: 100%;
            height: 100%;
        }
        `;
    }
    constructor()
    {
        super();
        const self = this;
        const waitToDoSetup = async () => { await self.updateComplete; self.setupElement(); };
        waitToDoSetup();
    }
    setupElement()
    {
        this.vertexShaderSource = `#version 300 es

        in vec4 a_position;

        void main()
        {
          gl_Position = a_position;
        }`;
        /*
        this.fragmentShaderSource = `#version 300 es

        precision mediump float;

        uniform float iTime;
        uniform vec2 iResolution;

        out vec4 fragColor;

        void main()
        {
            vec2 fragCoord = gl_FragCoord.xy;
            // Normalized pixel coordinates (from 0 to 1)
            vec2 uv = fragCoord/iResolution.xy;

            // Time varying pixel color
            vec3 col = 0.5 + 0.5*cos(iTime+uv.xyx+vec3(0,2,4));

            // Output to screen
            fragColor = vec4(col,1.0);
        }
        `;
        */

        const prefix_code = `#version 300 es
        precision mediump float;

        uniform float iTime;
        uniform vec2 iResolution;
        uniform vec4 iMouse;

        out vec4 shadertoy_final_frag_color;
        `;
        const wip = this.querySelector('#fragment-shader').innerText;
        const suffix_code = `void main() { mainImage(shadertoy_final_frag_color, gl_FragCoord.xy);  }`;

        // cout(prefix_code);
        // cout(wip);
        // cout(suffix_code);
        this.fragmentShaderSource = prefix_code + wip + suffix_code;


        // cout('vertex shader source:', this.vertexShaderSource);
        // cout('fragment shader source:', this.fragmentShaderSource);
        this.initCanvas();
    }
    initCanvas()
    {
        this.canvas = this.shadowRoot.querySelector('canvas');
        cout(this.canvas.width, this.canvas.height);
        cout(this.canvas.clientWidth, this.canvas.clientHeight);
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.gl = this.canvas.getContext('webgl2');
        this.compileShaders();
        this.uploadVertices();
        this.clearCanvas();
        window.requestAnimationFrame(this.renderToCanvas.bind(this));
        cout('done setting up canvas');
    }
    clearCanvas()
    {
        const {gl} = this;
        // clear viewport
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
    compileShaders()
    {
        const {gl, vertexShaderSource, fragmentShaderSource} = this;
        // Compile all the shaders.
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

        // Create and link all shader programs.
        const program = createProgram(gl, vertexShader, fragmentShader);

        // Get locations of shader inputs.
        const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
        const iResolutionLocation = gl.getUniformLocation(program, 'iResolution');
        const iTimeLocation = gl.getUniformLocation(program, 'iTime');
        this.shaders = {vertexShader, fragmentShader, program, locations : {positionAttributeLocation, iTimeLocation, iResolutionLocation}};
    }
    uploadVertices()
    {
        const {gl, shaders} = this;
        const {positionAttributeLocation} = shaders.locations;
        // Upload rectangle coordinates.
        const positions = [
            -1, -1,
            -1,  1,
             1,  1,
             1,  1,
             1, -1,
            -1, -1
        ];
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        // Create a VAO to read the position data.
        const size = 2, type = gl.FLOAT, normalize = false, stride = 0, offset = 0;
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);
        this.vao = vao;
    }
    renderToCanvas(timestep)
    {
        const {gl, shaders, vao} = this;
        const {program} = shaders;
        const {iTimeLocation, iResolutionLocation} = shaders.locations;

        const delta = timestep - (this.prev_timestep === undefined ? timestep : this.prev_timestep);
        this.prev_timestep = timestep;

        this.clearCanvas();
    
        // render
        gl.useProgram(program);
        gl.bindVertexArray(vao);
        gl.uniform1f(iTimeLocation, timestep * 0.001);
        gl.uniform2f(iResolutionLocation, gl.canvas.width, gl.canvas.height);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        window.requestAnimationFrame(this.renderToCanvas.bind(this));
    }
    render()
    {
        return html`<canvas></canvas>`;
    }
}

customElements.define('shadertoy-element', ShadertoyElement);
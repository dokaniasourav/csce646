"use strict";

const UNIFORM_MAX = 25;

const vertexShaderSource = `#version 300 es

    #pragma vscode_glsllint_stage: vert

    in vec2 a_position;
    in vec2 a_texCord;
    uniform vec2 u_resolution;
    out vec2 v_texCord;
    
    // all shaders have a main function
    void main() {

      vec2 zeroToOne = a_position / u_resolution;
      vec2 zeroToTwo = zeroToOne * 2.0;
      vec2 clipSpace = zeroToTwo - 1.0;    
      gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
      v_texCord = a_texCord;
    }
`;

const fragmentShaderSource = `#version 300 es

    #pragma vscode_glsllint_stage: frag

    precision highp float;
    
    uniform sampler2D u_image;
    in vec2 v_texCord;
    out vec4 outColor;
    uniform float u_kernel[${UNIFORM_MAX*UNIFORM_MAX}];
    uniform float u_kernel_weight;
    uniform int u_kernel_size;
    
    void main() {
        vec2 onePixel = vec2(1) / vec2(textureSize(u_image, 0));
        vec4 colorSum = vec4(0.0);      // Initially zero -- 0.0, 0.0, 0.0, 0.0
        float kernelSum = 0.0;
        int index = 0;

        for(int i=-(u_kernel_size - 1)/2; i<=(u_kernel_size - 1)/2; i++)
        {
            for(int j=-(u_kernel_size - 1)/2; j<=(u_kernel_size - 1)/2; j++)
            {
                index = (i + (u_kernel_size - 1)/2 ) * u_kernel_size + (j + (u_kernel_size - 1)/2);
                colorSum += texture(u_image, v_texCord + onePixel * vec2(i,j)) * u_kernel[index];
                kernelSum += u_kernel[index];
            }
        }
        kernelSum = kernelSum / 1.0;
        colorSum = vec4((colorSum).rgb/kernelSum, 1);
        outColor = vec4(colorSum.rgb, 1);
    }
`;

let k_size = 3;
let sel_angle = 0;
let filter_t = 1;
let kernel_data_loc;
let kernel_size_loc;
let all_kernel_dis_ele = [];

$('document').ready(() => {

    let canvas = document.querySelector("#main-canvas");
    let webgl = canvas.getContext("webgl2");
    if (!webgl) { return; }

    // setup GLSL program
    let program = webglUtils.createProgramFromSources(webgl,
        [vertexShaderSource, fragmentShaderSource]);
    webgl.useProgram(program);          // Tell it to use our program (pair of shaders)

    kernel_data_loc = webgl.getUniformLocation(program, 'u_kernel[0]');
    kernel_size_loc = webgl.getUniformLocation(program, 'u_kernel_size');


    /**
     * Generating HTML Test */
    let kernel_dis_ele = $('#kernel-rep');
    for (let i=0; i<UNIFORM_MAX*UNIFORM_MAX; i++) {
        const ele = $('<div class="kernel-ele" style="background-color: rgb(100%,100%,100%)"></div>');
        all_kernel_dis_ele.push(ele);
        kernel_dis_ele.append(ele);
    }


    /**
     * Updating image based on GUI
     * */
    const k_size_slider = $('#kernel_size_inp');
    const angle_slider = $('#angle_sel_inp');
    const filter_select = $('#filter-select');

    k_size_slider.val(k_size);
    angle_slider.val(sel_angle);
    image_update();

    k_size_slider.change(() => {
        k_size = k_size_slider.val();
        image_update();
    });

    angle_slider.change(() => {
        sel_angle = angle_slider.val();
        image_update();
        console.log('HELLO WORLD');
    });

    filter_select.change(() => {
        let option = filter_select.find(':selected');
        filter_t = parseInt(option.val());
        image_update();
    });

    /***
     * Making the image file */
    let image = new Image();
    image.src = 'img_flower.jpg'
    image.crossOrigin = "Anonymous";
    image.alt = 'Sample image';
    image.onload = () => {
        render_img(image, program);
    };
});

function image_update() {
    /**
     * Take the filter type and slider value and update the kernel in shader */
    let array_size = k_size * k_size;
    let kernel_data = [];
    $('#kernel_size_label').html(`Kernel Size: ${k_size} * ${k_size}`);
    $('#angle_sel_label').html(`Angle: ${sel_angle} degree`);
    let radian_angle = sel_angle * Math.PI / 180;
    if (filter_t === 1) {
        for(let i=0; i<k_size; i++) {
            for (let j = 0; j < k_size; j++) {
                kernel_data.push(1 / array_size);
            }
        }
    } else {
        for (let i = 0; i < k_size; i++) {
            for (let j = 0; j < k_size; j++) {
                let x = i + 0.5 - k_size/2.0;
                let y = j + 0.5 - k_size/2.0;
                let out = 1.0;
                if (filter_t === 2) {
                    let f_xy = (x*x + y*y) / k_size;
                    out = Math.exp(-f_xy);
                } else if (filter_t === 4) {
                    let f_xy = Math.cos(radian_angle) * x + Math.sin(radian_angle) * y;
                    out = Math.exp(-(f_xy*f_xy)/k_size);
                }
                kernel_data.push(out);
            }
        }
    }

    let kernel_sum = 0.0;
    for(let i=0; i<k_size; i++) {
        for (let j = 0; j < k_size; j++) {
            kernel_sum += kernel_data[i*k_size + j];
        }
    }

    for(let i=0; i<k_size; i++) {
        for (let j = 0; j < k_size; j++) {
            kernel_data[i*k_size + j] = kernel_data[i*k_size + j] / kernel_sum;
        }
    }

    for(let i=0; i<UNIFORM_MAX; i++) {
        for(let j=0; j<UNIFORM_MAX; j++) {
            if(i < k_size && j < k_size) {
                let per_val = (1 - 2*Math.atan(kernel_data[i*k_size + j] * array_size)/Math.PI)*100;
                let rgb_val = `rgb(${per_val}%, ${per_val}%, ${per_val}%)`;
                all_kernel_dis_ele[i*UNIFORM_MAX + j].css('background-color', rgb_val);
            } else {
                all_kernel_dis_ele[i*UNIFORM_MAX + j].css('background-color', 'rgb(100%,100%,100%)');
            }
        }
    }

    let canvas = document.querySelector("#main-canvas");
    let webgl = canvas.getContext("webgl2");
    webgl.uniform1fv(kernel_data_loc, kernel_data);
    webgl.uniform1i(kernel_size_loc, k_size);
    webgl.drawArrays(webgl.TRIANGLES, 0, 6);
}

function render_img(image, program) {
    /**
     * Set up the canvas and display image */
    let canvas = document.querySelector("#main-canvas");
    canvas.height = canvas.width * (image.height/image.width);
    let webgl = canvas.getContext("webgl2");
    if (!webgl) { return; }

    // Get locations of uniform variables
    const imageLocation = webgl.getUniformLocation(program, "u_image");
    const resolutionLocation = webgl.getUniformLocation(program, "u_resolution");


    /**
     * Passing the kernel information to the fragment shader */
    let kernel_info = [];
    for (let i = 0; i < 1; i++) {
        kernel_info.push(1);
    }
    const kernel_loc = webgl.getUniformLocation(program, 'u_kernel[0]');
    webgl.uniform1fv(kernel_loc, kernel_info);
    const kernel_size = webgl.getUniformLocation(program, 'u_kernel_size');
    webgl.uniform1i(kernel_size, 1);
    const kernel_weight = webgl.getUniformLocation(program, 'u_kernel_weight');
    webgl.uniform1f(kernel_weight, 1.0);


    /**
     *     Create a vertex array object (attribute state),
     *     and make it the one we're currently working with */
    let vertex_arr_obj = webgl.createVertexArray();
    webgl.bindVertexArray(vertex_arr_obj);


    /**
     *  Passing the position information to the vertex shader */
    let positionBuffer = webgl.createBuffer();
    const positionAttribute = webgl.getAttribLocation(program, "a_position");
    webgl.enableVertexAttribArray(positionAttribute);
    webgl.bindBuffer(webgl.ARRAY_BUFFER, positionBuffer);

    let size = 2;               // 2 components per iteration
    let stride = 0;             // 0 = move forward size * sizeof(type)
    // each iteration to get the next position
    let offset = 0;             // start at the beginning of the buffer
    webgl.vertexAttribPointer(positionAttribute, size, webgl.FLOAT, false, stride, offset);

    let x_1 = 0;
    let x_2 = canvas.width;
    let y_1 = 0;
    let y_2 = canvas.height;
    webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array([
        x_1, y_1,
        x_2, y_1,
        x_1, y_2,
        x_1, y_2,
        x_2, y_1,
        x_2, y_2,
    ]), webgl.STATIC_DRAW);


    /**
     *  Passing the texture coordinates to the vertex shader */
    const texCordAttribute = webgl.getAttribLocation(program, "a_texCord");
    webgl.enableVertexAttribArray(texCordAttribute);
    let texCordBuffer = webgl.createBuffer();
    webgl.bindBuffer(webgl.ARRAY_BUFFER, texCordBuffer);
    webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array([
        0.0, 0.0, 1.0, 0.0, 0.0, 1.0,    // Triangle 1
        0.0, 1.0, 1.0, 0.0, 1.0, 1.0,    // Triangle 2
    ]), webgl.STATIC_DRAW);
    webgl.vertexAttribPointer(texCordAttribute, size, webgl.FLOAT, false, stride, offset);



    /**
     * Creating a texture for image display */
    let texture = webgl.createTexture();
    // (ie, the unit all other texture commands will affect
    webgl.activeTexture(webgl.TEXTURE0 + 0);    // make unit 0 the active texture uint
    webgl.bindTexture(webgl.TEXTURE_2D, texture);     // Bind it to texture unit 0' 2D bind point
    // Set the parameters, so we don't need mips, and so we're not filtering,
    // and we don't repeat at the edges
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_WRAP_S, webgl.CLAMP_TO_EDGE);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_WRAP_T, webgl.CLAMP_TO_EDGE);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_MIN_FILTER, webgl.NEAREST);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_MAG_FILTER, webgl.NEAREST);

    /**
     *  Upload the image into the texture */
    let mipLevel = 0;                   // the largest mip
    let internalFormat = webgl.RGBA;    // format we want in the texture
    let srcFormat = webgl.RGBA;         // format of data we are supplying
    let srcType = webgl.UNSIGNED_BYTE;  // type of data we are supplying
    webgl.texImage2D(webgl.TEXTURE_2D,
        mipLevel,
        internalFormat,
        srcFormat,
        srcType,
        image);
    webglUtils.resizeCanvasToDisplaySize(webgl.canvas);

    /**
     *  Tell WebGL how to convert from clip space to pixels */
    webgl.viewport(0, 0, webgl.canvas.width, webgl.canvas.height);
    webgl.clearColor(0, 0, 0, 0);   // Clear the canvas
    webgl.clear(webgl.COLOR_BUFFER_BIT | webgl.DEPTH_BUFFER_BIT);
    webgl.bindVertexArray(vertex_arr_obj);  // Bind the attribute/buffer set we want.
    webgl.uniform2f(resolutionLocation, webgl.canvas.width, webgl.canvas.height);
    webgl.uniform1i(imageLocation, 0);  // Texture unit 0


    /**
     *  Making the draw call to actually draw this rectangle */
    offset = 0;
    let count = 6;
    webgl.drawArrays(webgl.TRIANGLES, offset, count);
}
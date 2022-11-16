
const UNIFORM_MAX = 25;

let slider_values = {};

let operation_t = 1;
let filter_t = 1;

let kernel_data_loc;
let kernel_size_loc;
let choice_algo_loc;
let intensity_loc;

/**
 * Updating image based on GUI
 * */
let operation_select;
let k_size_slider;
let intensity_slider;

let angle_slider;
let filter_select;

const getWebGL = () => {
    let canvas = document.querySelector("#main-canvas");
    let webgl = canvas.getContext("webgl2");
    if (!webgl) {
        window.alert('Webgl is not supported on this system');
    }
    return webgl;
}

$('document').ready(() => {
    fetch('/main.vert')
        .then((r1) => {
            r1.text().then((v_text) => {
                console.log('Vert shader loaded');
                fetch('/main.frag')
                    .then((r2) => {
                        r2.text().then((f_text) => {
                            console.log('Frag shader loaded');
                            startExec(v_text, f_text);
                        });
                    });
            });
        });
});

const startExec = (vertexShaderSource = '', fragmentShaderSource = '') => {
    const webgl = getWebGL();

    // setup GLSL program
    let program = webglUtils.createProgramFromSources(webgl,
        [vertexShaderSource, fragmentShaderSource]);
    webgl.useProgram(program);          // Tell it to use our program (pair of shaders)

    kernel_data_loc = webgl.getUniformLocation(program, 'u_kernel[0]');
    kernel_size_loc = webgl.getUniformLocation(program, 'u_kernel_size');
    choice_algo_loc = webgl.getUniformLocation(program, 'choice_algo');
    intensity_loc = webgl.getUniformLocation(program, 'intensity');


    operation_select = $('#operation-select');
    filter_select = $('#filter-select');

    k_size_slider = $('#kernel_size_inp');
    angle_slider = $('#angle_sel_inp');
    intensity_slider = $('#intensity_inp');

    slider_values[angle_slider.attr('name')] = 0;
    slider_values[k_size_slider.attr('name')] = 25;
    slider_values[intensity_slider.attr('name')] = 10;

    // Setting the defaults
    k_size_slider.attr('max', UNIFORM_MAX);
    image_update();

    for (let slider of [k_size_slider, angle_slider, intensity_slider]) {
        let a_name = slider.attr('name');
        $('#' + a_name + '_label').html(`${a_name}: ${slider_values[a_name]}`);
        slider.val(slider_values[a_name]);
        slider.change(() => {
            let a_name = slider.attr('name');
            slider_values[a_name] = parseInt(slider.val());
            image_update();
        })
    }

    filter_select.change(() => {
        let option = filter_select.find(':selected');
        filter_t = parseInt(option.val());
        image_update();
    });

    operation_select.change(() => {
        let option = operation_select.find(':selected');
        operation_t = parseInt(option.val());
        image_update();
    });

    /***
     * Making the image file */
    let image = new Image();
    image.src = 'fox.jpg'
    image.crossOrigin = "Anonymous";
    image.alt = 'Sample image';
    image.onload = () => {
        render_img(image, program);
    };
};

function image_update() {
    /**
     * Take the filter type and slider value and update the kernel in shader */
    let k_size = slider_values[k_size_slider.attr('name')];
    let sel_angle = slider_values[angle_slider.attr('name')];
    let intensity = slider_values[intensity_slider.attr('name')];

    let array_size = k_size * k_size;
    let kernel_data = [];

    if (filter_t === 1) {
        for (let i = 0; i < k_size; i++) {
            for (let j = 0; j < k_size; j++) {
                kernel_data.push(1 / array_size);
            }
        }
    } else {
        let radian_angle = sel_angle * Math.PI / 180;
        for (let i = 0; i < k_size; i++) {
            for (let j = 0; j < k_size; j++) {
                let x = i + 0.5 - k_size / 2.0;
                let y = j + 0.5 - k_size / 2.0;
                let out = 1.0;
                if (filter_t === 2) {
                    let f_xy = (x * x + y * y) / k_size;
                    out = Math.exp(-f_xy);
                } else if (filter_t === 4) {
                    let f_xy = Math.cos(radian_angle) * x + Math.sin(radian_angle) * y;
                    out = Math.exp(-(f_xy * f_xy) / k_size);
                }
                kernel_data.push(out);
            }
        }
    }

    /* Find out the sum of kernel array */
    let kernel_sum = 0.0;
    for (let i = 0; i < k_size; i++) {
        for (let j = 0; j < k_size; j++) {
            kernel_sum += kernel_data[i * k_size + j];
        }
    }

    let max_value = -100000000;
    /* Normalize this array */
    for (let i = 0; i < k_size; i++) {
        for (let j = 0; j < k_size; j++) {
            kernel_data[i * k_size + j] = kernel_data[i * k_size + j] / kernel_sum;
            /* Find out the max value for normalization */
            if (max_value < kernel_data[i * k_size + j]) {
                max_value = kernel_data[i * k_size + j];
            }
        }
    }

    /**
     * Generating HTML Test */
    const kernel_display_element = $('#kernel-rep');
    kernel_display_element.html('');
    kernel_display_element.css('grid-template-columns', 'repeat(' + k_size + ', 0.5vh)');
    kernel_display_element.css('grid-template-rows', 'repeat(' + k_size + ', 0.5vh)');
    kernel_display_element.css('height', '0.5vh');

    for (let i = 0; i < k_size; i++) {
        for (let j = 0; j < k_size; j++) {
            // let per_val = (1 - kernel_data[i*k_size + j])*100;
            const per_val = (1 - 2 * Math.atan(kernel_data[i * k_size + j] * array_size) / Math.PI) * 100;
            const rgb_val = `rgb(${per_val}%, ${per_val}%, ${per_val}%)`;
            const ele = $('<div class="kernel-ele" style="background-color: ' + rgb_val + '"></div>');
            kernel_display_element.append(ele);
        }
    }

    let webgl = getWebGL();
    webgl.uniform1fv(kernel_data_loc, kernel_data);
    webgl.uniform1i(kernel_size_loc, k_size);
    webgl.uniform1i(choice_algo_loc, operation_t);
    webgl.uniform1i(intensity_loc, intensity)
    webgl.drawArrays(webgl.TRIANGLES, 0, 6);
}

const create_texture = () => {
    /**
     * Creating a texture for image display */
    const webgl = getWebGL();
    const texture = webgl.createTexture();
    webgl.bindTexture(webgl.TEXTURE_2D, texture);     // Bind it to texture unit 0' 2D bind point
    // Set the parameters, so we don't need mips,
    // and so we're not filtering and we don't repeat at the edges
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_WRAP_S, webgl.CLAMP_TO_EDGE);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_WRAP_T, webgl.CLAMP_TO_EDGE);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_MIN_FILTER, webgl.NEAREST);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_MAG_FILTER, webgl.NEAREST);

    return texture;
};

const render_img = (image, program) => {
    /**
     * Set up the canvas and display image */
    let canvas = document.querySelector("#main-canvas");
    canvas.height = canvas.width * (image.height / image.width);
    let webgl = getWebGL();
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
    webgl.uniform1fv(kernel_data_loc, kernel_info);
    webgl.uniform1i(kernel_size_loc, 1);

    /**
     *     Create a vertex array object (attribute state),
     *     and make it the one we're currently working with */
    let vertex_arr_obj = webgl.createVertexArray();
    webgl.bindVertexArray(vertex_arr_obj);


    /**
     *  Passing the position information to the vertex shader */
    const positionAttribute = webgl.getAttribLocation(program, "a_position");
    webgl.enableVertexAttribArray(positionAttribute);

    let positionBuffer = webgl.createBuffer();
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
        x_1, y_1, x_2, y_1, x_1, y_2,
        x_1, y_2, x_2, y_1, x_2, y_2,
    ]), webgl.STATIC_DRAW);


    /**
     *  Passing the texture coordinates to the vertex shader */
    const texCordAttribute = webgl.getAttribLocation(program, "a_texCord");
    webgl.enableVertexAttribArray(texCordAttribute);

    let texCordBuffer = webgl.createBuffer();
    webgl.bindBuffer(webgl.ARRAY_BUFFER, texCordBuffer);
    webgl.vertexAttribPointer(texCordAttribute, size, webgl.FLOAT, false, stride, offset);

    webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array([
        0.0, 0.0, 1.0, 0.0, 0.0, 1.0,    // Triangle 1
        0.0, 1.0, 1.0, 0.0, 1.0, 1.0,    // Triangle 2
    ]), webgl.STATIC_DRAW);



    /**
     * Creating a texture for image display */
    const texture = create_texture();
    console.log('Created texture ', texture);
    webgl.activeTexture(webgl.TEXTURE0 + 0);    // make unit 0 the active texture uint

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
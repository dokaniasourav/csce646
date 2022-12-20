

class slider_controls {
    constructor(name, def, min, max, step=1.0) {
        this.name = name;
        this.min = min;
        this.max = max;

        this.slider = $('#' + name + '_inp');
        this.label = $('#' + name + '_label');

        if (! this.slider) {
            console.log('Something is wrong with this element');
        }

        this.slider.attr('max', max);
        this.slider.attr('min', min);
        this.slider.attr('step', step);

        this.slider_val = def;
        this.label.html(' ' + def);

        this.slider.change(() => {
            let t_val = this.slider_val;
            this.label.html(' ' + t_val);
            this.slider_val = t_val;
            update_all_canvas_ele();
        })
    }

    get slider_val() {
        this.value = parseInt(this.slider.val());
        return this.value;
    }

    set slider_val(val) {
        this.value = val;
        this.slider.val(val);
    }
}


const MAIN_CANVAS = '#main-canvas'
const SIDE_CANVAS = '#filter-canvas'

// let operation_t = CONVOLUTION_FILTER;
let filter_t;

const canvas_ids = [MAIN_CANVAS, SIDE_CANVAS];
let image_sources = {};
let webgl_programs = {};
let webgl_elements = {};
let webgl_program_sources = {};

/**
 * Updating image based on GUI
 * */

let k_size_slider;
let intensity_slider;
let steep_slider;
let angle_slider;

const getWebGL = (canvas_id = '') => {
    if (canvas_id.charAt(0) !== '#') {
        console.log('Invalid canvas ID provided');
        return;
    }
    if (canvas_id in webgl_elements) {
        return webgl_elements[canvas_id];
    } else {
        let canvas = document.querySelector(canvas_id);
        let webgl = canvas.getContext("webgl2");
        if (!webgl) {
            window.alert('Webgl is not supported on this system');
            return null;
        }
        webgl_elements[canvas_id] = webgl;
        return webgl;
    }
}

$('document').ready(() => {

    image_sources[MAIN_CANVAS] = 'assets/mountain.jpg';
    image_sources[SIDE_CANVAS] = 'assets/mountain.jpg';

    executeOnLoad('main.vert', 'main.frag', MAIN_CANVAS);
    executeOnLoad('filter.vert', 'filter.frag', SIDE_CANVAS);

    const filter_select = $('#filter-select');
    const image_select = $('#image-select');
    // const image_select_grp = $('#image-select-group');

    const input_box_x = $('#input_x');
    const input_box_y = $('#input_y');
    const input_group_xy = $('#input_group_xy');
    const input_button_xy = $('#input_xy_btn');

    input_box_x.val('-0.2 + sin(y)*sin(tan(cos(x))+tan(cos(y)))');
    input_box_y.val('tan(y)*exp(((y-0.2)/(x + 0.2))*0.01) + sin(x)*sin(tan(cos(x))+tan(cos(y)))')

    input_button_xy.click(() => {
        replace_and_run(
            ['FUNC_REP_XX = SOME_FUNCTION_FOR_X;', 'FUNC_REP_YY = SOME_FUNCTION_FOR_Y;'],
            ['FUNC_REP_XX = ' + input_box_x.val() + ';', 'FUNC_REP_YY = ' + input_box_y.val() + ';'],
            MAIN_CANVAS
        );
        replace_and_run(
            ['FUNC_REP_XX = SOME_FUNCTION_FOR_X;', 'FUNC_REP_YY = SOME_FUNCTION_FOR_Y;'],
            ['FUNC_REP_XX = ' + input_box_x.val() + ';', 'FUNC_REP_YY = ' + input_box_y.val() + ';'],
            SIDE_CANVAS
        );
    })



    angle_slider = new slider_controls('angle',
        45,0, 90, 5);
    steep_slider = new slider_controls('steep',
        11, 1, 100, 2);
    k_size_slider = new slider_controls('k_size',
        50, 5, 250, 2);
    intensity_slider = new slider_controls('intensity',
        2, 1, 15, 1);

    filter_select.change(() => {
        let option = filter_select.find(':selected');
        filter_t = parseInt(option.val());
        update_all_canvas_ele();
        if (filter_t === 6) {
            input_group_xy.show(500);
            console.log(input_box_x.val(), input_box_y.val())
        } else {
            input_group_xy.hide(500);
        }
    });

    // image_select_grp.hide(200);

    image_select.change(() => {
        console.log(image_sources);
        let option_sel = image_select.find(':selected').val();
        console.log(option_sel);
        image_sources[MAIN_CANVAS] = 'assets/' + option_sel;
        image_sources[SIDE_CANVAS] = 'assets/' + option_sel;
        console.log(image_sources);
        replace_and_run(
            [], [],
            MAIN_CANVAS
        );
        replace_and_run(
            [], [],
            SIDE_CANVAS
        );
    });

    const download_btn = $('#download_img');
    download_btn.click(() => {
        download_img(MAIN_CANVAS);
    })
    input_group_xy.hide(500);
    filter_t = parseInt(filter_select.find(':selected').val());

    const interval = setInterval(() => {
        regular_update(SIDE_CANVAS);
    }, 1);

    const interval2 = setInterval(() => {
        let fps2 = fps;
        fps = 0;
        console.log(fps2);
    }, 1000);

});

let steepness = 100000;
let fps = 0;

const regular_update = (canvas_id) => {
    let webgl = getWebGL(canvas_id);
    let program = webgl_programs[canvas_id];
    const steep_loc = webgl.getUniformLocation(program, 'steep');
    webgl.uniform1f(steep_loc, steepness);
    webgl.drawArrays(webgl.TRIANGLES, 0, 6);

    steepness -= 0.05;
    if (steepness < 0) {
        steepness = 0.0;
    }
    fps += 1;
}

const update_all_canvas_ele = () => {
    for (let canvas_id of canvas_ids) {
        image_update(canvas_id);
    }
}

const download_img = (canvas_id) => {
    let link = document.createElement('a');
    link.download = image_sources[canvas_id];
    link.href = document.getElementById(canvas_id).toDataURL()
    link.click();
}

const executeOnLoad = (vertexSrc = '', fragSrc = '', canvas_id = '') => {
    fetch(vertexSrc)
        .then((r1) => {
            r1.text().then((v_text) => {
                // console.log('Vert shader program ' + vertexSrc + ' has been loaded');
                fetch(fragSrc)
                    .then((r2) => {
                        r2.text().then((f_text) => {
                            // console.log('Frag shader program ' + fragSrc + ' has been loaded');
                            webgl_program_sources[canvas_id] = {
                                'vert': v_text,
                                'frag': f_text
                            };
                            // Need to replace this text
                            // f_text = f_text.replace('xx = SOME_FUNCTION_FOR_X', 'xx = 0.0 - xy_c.y');
                            // f_text = f_text.replace('yy = SOME_FUNCTION_FOR_Y', 'yy = 0.0 + xy_c.x');
                            return createProgram(canvas_id, v_text, f_text);
                        });
                    });
            });
        });
}

const replace_and_run = (orig_strings, new_strings, canvas_id) => {
    let v_text = webgl_program_sources[canvas_id]['vert'];
    let f_text = webgl_program_sources[canvas_id]['frag'];
    for(let i = 0; i < orig_strings.length; i++) {
        f_text = f_text.replace(orig_strings[i], new_strings[i]);
    }
    createProgram(canvas_id, v_text, f_text);
}

const createProgram = (canvas_id = '', vertexShaderSource = '', fragmentShaderSource = '') => {

    const webgl = getWebGL(canvas_id);

    const input_error_box = $('#input_error_box');

    input_error_box.hide();

    // setup the GLSL programs
    let program = webglUtils.createProgramFromSources(webgl,
        [vertexShaderSource, fragmentShaderSource], null, null, (error_text) => {
            console.log('Custom callback function');
            let split_logs = error_text.split('\n');
            let e_text = '';
            for (const split_log of split_logs) {
                if (split_log.indexOf('ERROR') > 0) {
                    e_text = split_log + '\n';
                }
            }
            input_error_box.show();
            input_error_box.html(e_text);
            console.error(error_text);
        });

    console.log('Loaded program = ', program);
    webgl.useProgram(program);          // Tell it to use our program (pair of shaders)

    webgl_programs[canvas_id] = program;

    let image = new Image();
    image.src = image_sources[canvas_id];
    image.crossOrigin = 'Anonymous';
    image.alt = 'Sample image for ' + canvas_id + 'of ' + image_sources[canvas_id];
    image.onload = () => {
        render_img(canvas_id, image, program);
    };
    image_update(canvas_id);
}

function image_update(canvas_id) {
    /**
     * Take the filter type and slider value and update the kernel in shader */
    let webgl = getWebGL(canvas_id);
    let program = webgl_programs[canvas_id];

    /**
     * Update the convolution filter properties */
    let k_size = k_size_slider.value;
    let sel_angle = angle_slider.value;
    let intensity = intensity_slider.value;
    let steepness = steep_slider.value;

    const function_sel_loc = webgl.getUniformLocation(program, 'function_sel');
    const kernel_size_loc = webgl.getUniformLocation(program, 'u_kernel_size');
    const intensity_loc = webgl.getUniformLocation(program, 'intensity');
    const angle_loc = webgl.getUniformLocation(program, 'angle');
    const steep_loc = webgl.getUniformLocation(program, 'steep');

    webgl.uniform1i(function_sel_loc, filter_t);
    webgl.uniform1i(kernel_size_loc, k_size);

    webgl.uniform1f(intensity_loc, intensity);
    webgl.uniform1f(angle_loc, sel_angle);
    webgl.uniform1f(steep_loc, steepness);

    // if (canvas_id === MAIN_CANVAS) {
    // } else if (canvas_id === SIDE_CANVAS) {
    // }
    webgl.drawArrays(webgl.TRIANGLES, 0, 6);
}

const create_texture = (canvas_id) => {
    /**
     * Creating a texture for image display */
    const webgl = getWebGL(canvas_id);
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

const render_img = (canvas_id='', image, program) => {
    /**
     * Set up the canvas and display image */
    let canvas = document.querySelector(canvas_id);
    canvas.height = canvas.width * (image.height / image.width);
    let webgl = getWebGL(canvas_id);
    if (!webgl) { return }

    // Get locations of uniform variables
    const imageLocation = webgl.getUniformLocation(program, "u_image");
    const resolutionLocation = webgl.getUniformLocation(program, "u_resolution");

    /*     Create a vertex array object (attribute state),
     *     and make it the one we're currently working with  */

    let vertex_arr_obj = webgl.createVertexArray();
    webgl.bindVertexArray(vertex_arr_obj);

    /**
     *  Passing the position information to the vertex shader */
    const positionAttribute = webgl.getAttribLocation(program, "a_position");
    webgl.enableVertexAttribArray(positionAttribute);

    let positionBuffer = webgl.createBuffer();
    webgl.bindBuffer(webgl.ARRAY_BUFFER, positionBuffer);

    let size = 2;
    let stride = 0;             // 0 = move forward size * sizeof(type)
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
    const texture = create_texture(canvas_id);
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
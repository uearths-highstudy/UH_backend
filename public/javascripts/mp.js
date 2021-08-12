let subject = document.getElementById("subject");
let title = document.getElementById("title");
let sdate = document.getElementById("sdate");
let edate = document.getElementById("sdate");

let addp = document.getElementById("addp");
let submit = document.getElementById("make");

let mp = document.getElementById("mp");


addp.addEventListener("click", () => {
    let problems = document.querySelectorAll(".problem");
    let num = Number(problems[problems.length-1].classList[1])+1;
    
    let problem = document.createElement("div");
    problem.classList.add("problem", String(num));


    let top = document.createElement("div");
    top.classList.add("top");

    let no = document.createElement("span");
    no.classList.add("no");
    no.innerHTML = `${String(num)} 번`;
    let ptitle = document.createElement("input");
    ptitle.type = "text";
    ptitle.classList.add("ptitle");
    ptitle.name = "ptitle";
    ptitle.placeholder="문제";
    let psubject = document.createElement("select");
    psubject.name = "psubject";
    psubject.dataset.idx = String(num);
    psubject.addEventListener("change", function(){ch_field(this);});
    let option_none = document.createElement("option");
    let option_multiple = document.createElement("option");
    let option_short = document.createElement("option");
    let option_essay = document.createElement("option");
    let option_dynamic_essay = document.createElement("option");
    option_none.value = "none";
    option_none.selected = true;
    option_none.disabled = true;
    option_none.innerHTML = "문제유형 선택";
    option_multiple.value = "multiple";
    option_multiple.innerHTML = "객관식";
    option_short.value = "short";
    option_short.innerHTML = "주관식";
    option_essay.value = "essay";
    option_essay.innerHTML = "서술형";
    option_dynamic_essay.value = "dynamic_essay";
    option_dynamic_essay.innerHTML = "답이 있는 서술형";
    psubject.appendChild(option_none);
    psubject.appendChild(option_multiple);
    psubject.appendChild(option_short);
    psubject.appendChild(option_essay);
    psubject.appendChild(option_dynamic_essay);

    top.appendChild(no);
    top.appendChild(ptitle);
    top.appendChild(psubject);


    let see = document.createElement("div");
    see.classList.add("see");

    let p = document.createElement("p");
    p.innerHTML = "보기 유형 (선택)";
    let f = document.createElement("input");
    f.type = "file";
    f.style.display = "none";
    let div = document.createElement("div");
    let pseeimagebtn = document.createElement("input");
    pseeimagebtn.classList.add("pseeimagebtn");
    pseeimagebtn.value = "이미지";
    pseeimagebtn.type = "button";
    let pseetextbtn = document.createElement("input");
    pseetextbtn.classList.add("pseetextbtn");
    pseetextbtn.value = "텍스트";
    pseetextbtn.type = "button";
    div.appendChild(pseeimagebtn);
    div.appendChild(pseetextbtn);

    see.appendChild(p);
    see.appendChild(f);
    see.appendChild(div);


    let answer = document.createElement("div");
    answer.classList.add("answer", String(num));

    let panswer = document.createElement("input");
    panswer.type = "text";
    panswer.name = "panswer";
    panswer.classList.add("panswer");
    panswer.placeholder = "답 (객관식경우 숫자)";
    answer.appendChild(panswer);

    problem.appendChild(top);
    problem.appendChild(see);
    problem.appendChild(answer);

    mp.appendChild(problem);
});

function ch_field(sel) {
    let problem = sel.parentNode.parentNode;
    let num = Number(problem.classList[1]);
    if(sel.value == 'multiple') {
        let field = document.createElement("div");
        field.classList.add("field", String(num));

        let p1 = document.createElement("input");
        let p2 = document.createElement("input");
        let p3 = document.createElement("input");
        let p4 = document.createElement("input");
        let p5 = document.createElement("input");
        p1.type = "text";
        p2.type = "text";
        p3.type = "text";
        p4.type = "text";
        p5.type = "text";
        p1.name = `p${String(num)}1`;
        p2.name = `p${String(num)}2`;
        p3.name = `p${String(num)}3`;
        p4.name = `p${String(num)}4`;
        p5.name = `p${String(num)}5`;
        p1.placeholder = "1 번";
        p2.placeholder = "2 번";
        p3.placeholder = "3 번";
        p4.placeholder = "4 번";
        p5.placeholder = "5 번";
        field.appendChild(p1);
        field.appendChild(p2);
        field.appendChild(p3);
        field.appendChild(p4);
        field.appendChild(p5);

        problem.appendChild(field);
    } else {
        try {
            let fields = document.querySelectorAll(`.field`);
            for(let field of fields) {
                if(field.classList.contains(String(num))) {
                    problem.removeChild(field);
                }
            }
        } catch(err) {
            console.log(err);
            return;
        }
    }
}
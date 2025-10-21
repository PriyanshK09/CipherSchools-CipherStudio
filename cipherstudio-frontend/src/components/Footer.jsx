import React from "react";
import { Mail, Apple, Play, Youtube, Instagram, Linkedin, Github, Facebook, Twitter } from "lucide-react";

const ExternalLink = ({ href, children, id }) => (
  <a
    href={href}
    id={id}
    target="_blank"
    rel="noreferrer"
    className="group inline-flex items-center gap-2 text-slate-400 transition hover:text-amber-400"
  >
    {children}
  </a>
);

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="relative border-t border-slate-800/60 bg-slate-950 text-slate-300">
      {/* Amber accent line */}
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
      {/* Subtle grid background */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(251,191,36,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(251,191,36,0.04)_1px,transparent_1px)] bg-[size:64px_64px] opacity-[0.15] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,black,transparent)]" />

      <div className="relative mx-auto w-full max-w-7xl px-6 py-14">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          {/* Branding + email + apps */}
          <aside className="space-y-5">
            <div className="flex items-center gap-3">
              <img
                src="/favicon.ico"
                alt="CipherSchools"
                className="h-10 w-10 rounded-full ring-1 ring-amber-500/30"
                loading="lazy"
              />
              <h2 className="text-xl font-semibold tracking-tight text-slate-100">
                Cipher<span className="text-amber-500">Schools</span>
              </h2>
            </div>
            <p className="text-[15px] leading-relaxed text-slate-400">
              Cipherschools is a bootstrapped educational video streaming platform in India that is connecting passionate unskilled students to skilled Industry experts to fulfill their career dreams.
            </p>

            <nav className="mt-4 space-y-5">
              <a
                href="mailto:support@cipherschools.com"
                target="_blank"
                id="Footer_Email"
                className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-3 py-1.5 text-slate-200 shadow-sm transition hover:border-amber-500/60 hover:text-amber-400"
                rel="noreferrer"
              >
                <Mail size={18} /> support@cipherschools.com
              </a>
            </nav>
          </aside>

          {/* Online Compilers */}
          <aside>
            <h5 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Online Compilers</h5>
            <nav className="flex flex-col gap-2 text-[15px]">
              <ExternalLink href="https://www.cipherschools.com/c-programming-online-compiler" id="Footer_C_Compiler"><span className="text-slate-500 transition group-hover:text-amber-500">→</span> C Compiler</ExternalLink>
              <ExternalLink href="https://www.cipherschools.com/cpp-programming-online-compiler" id="Footer_CPP_Compiler"><span className="text-slate-500 transition group-hover:text-amber-500">→</span> Cpp Compiler</ExternalLink>
              <ExternalLink href="https://www.cipherschools.com/java-programming-online-compiler" id="Footer_Java_Compiler"><span className="text-slate-500 transition group-hover:text-amber-500">→</span> Java Compiler</ExternalLink>
              <ExternalLink href="https://www.cipherschools.com/python-programming-online-compiler" id="Footer_Python_Compiler"><span className="text-slate-500 transition group-hover:text-amber-500">→</span> Python Compiler</ExternalLink>
              <ExternalLink href="https://www.cipherschools.com/javascript-online-compiler" id="Footer_Javascript_Compiler"><span className="text-slate-500 transition group-hover:text-amber-500">→</span> Javascript Compiler</ExternalLink>
            </nav>
          </aside>

          {/* Popular Courses */}
          <aside>
            <h5 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Popular Courses</h5>
            <nav className="flex flex-col gap-2 text-[15px]">
              <ExternalLink href="https://www.cipherschools.com/courses/data-science" id="Footer_PC_DataScience"><span className="text-slate-500 transition group-hover:text-amber-500">→</span> Data Science</ExternalLink>
              <ExternalLink href="https://www.cipherschools.com/courses/programming" id="Footer_PI_Programming"><span className="text-slate-500 transition group-hover:text-amber-500">→</span> Programming</ExternalLink>
              <ExternalLink href="https://www.cipherschools.com/courses/data-structures" id="Footer_PI_DataStructures"><span className="text-slate-500 transition group-hover:text-amber-500">→</span> Data Structures</ExternalLink>
              <ExternalLink href="https://www.cipherschools.com/courses/machine-learning" id="Footer_PI_MachineLearning"><span className="text-slate-500 transition group-hover:text-amber-500">→</span> Machine Learning</ExternalLink>
              <ExternalLink href="https://www.cipherschools.com/courses/web-development" id="Footer_PI_WebDevelopment"><span className="text-slate-500 transition group-hover:text-amber-500">→</span> Web Development</ExternalLink>
              <ExternalLink href="https://www.cipherschools.com/courses/game-development" id="Footer_PI_GameDevelopment"><span className="text-slate-500 transition group-hover:text-amber-500">→</span> Game Development</ExternalLink>
            </nav>
          </aside>

          {/* Company Info */}
          <aside>
            <h5 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Company Info</h5>
            <nav className="flex flex-col gap-2 text-[15px]">
              <ExternalLink href="https://blog.cipherschools.com" id="Footer_CI_Blog"><span className="text-slate-500 transition group-hover:text-amber-500">→</span> Blog</ExternalLink>
              <ExternalLink href="https://www.cipherschools.com/courses" id="Footer_CI_Courses"><span className="text-slate-500 transition group-hover:text-amber-500">→</span> Courses</ExternalLink>
              <ExternalLink href="https://www.cipherschools.com/aboutus" id="Footer_CI_AboutUs"><span className="text-slate-500 transition group-hover:text-amber-500">→</span> About us</ExternalLink>
              <ExternalLink href="https://www.cipherschools.com/alumni" id="Footer_CI_Alumni"><span className="text-slate-500 transition group-hover:text-amber-500">→</span> Alumni</ExternalLink>
              <ExternalLink href="https://www.cipherschools.com/privacy-policy" id="Footer_CI_PrivacyPolicy"><span className="text-slate-500 transition group-hover:text-amber-500">→</span> Privacy Policy</ExternalLink>
              <ExternalLink href="https://www.cipherschools.com/terms-and-condition" id="Footer_CI_TermAndCond"><span className="text-slate-500 transition group-hover:text-amber-500">→</span> Terms & Condition</ExternalLink>
            </nav>
          </aside>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-800/80 bg-slate-900/60">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 text-sm text-slate-400 md:flex-row">
          <p>© {year} CipherSchools · All Rights Reserved</p>
          <div className="flex items-center gap-2">
            {[
              { href: "https://www.youtube.com/@cipherschools", id: "Footer_Social_YT", Icon: Youtube, label: "YouTube" },
              { href: "https://www.instagram.com/cipherschools", id: "Footer_Social_IG", Icon: Instagram, label: "Instagram" },
              { href: "https://www.linkedin.com/company/cipherschools", id: "Footer_Social_LI", Icon: Linkedin, label: "LinkedIn" },
              { href: "https://github.com/cipherschools", id: "Footer_Social_GH", Icon: Github, label: "GitHub" },
              { href: "https://www.facebook.com/cipherschools", id: "Footer_Social_FB", Icon: Facebook, label: "Facebook" },
              { href: "https://twitter.com/cipherschools", id: "Footer_Social_X", Icon: Twitter, label: "Twitter" },
            ].map(({ href, id, Icon, label }) => (
              <a
                key={id}
                href={href}
                id={id}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 text-slate-400 transition hover:border-amber-500/50 hover:text-amber-400 bg-slate-900/60"
              >
                <Icon size={18} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
